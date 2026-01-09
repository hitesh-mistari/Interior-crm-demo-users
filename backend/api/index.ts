import express from 'express';
import cors from 'cors';
import serverless from 'serverless-http';
import { z } from 'zod';
import { query, withTransaction, queryClient } from '../db';

export const app = express();
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://untyrannic-dottie-nonregressively.ngrok-free.dev',
    process.env.APP_ORIGIN || 'https://your-app.vercel.app',
  ],
  credentials: false,
}));
app.use(express.json());

const TeamMemberSchema = z.object({
  id: z.string().uuid().optional(),
  teamId: z.string().uuid(),
  name: z.string().min(1),
  age: z.number().int().min(0).optional(),
  skills: z.array(z.string()).optional(),
  employmentStatus: z.enum(['full_time', 'part_time', 'contract']).optional(),
  rateType: z.enum(['hourly', 'daily', 'fixed']).optional(),
  rateAmount: z.number().optional(),
  photoUrl: z.string().url().optional(),
});

// List active team members
app.get('/api/team-members', async (req, res) => {
  try {
    const rows = await query(`
      SELECT *
      FROM team_members
      ORDER BY name ASC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list team members' });
  }
});

// Create team member
app.post('/api/team-members', async (req, res) => {
  try {
    const data = TeamMemberSchema.parse(req.body);
    const id = data.id ?? crypto.randomUUID();

    await query(
      `INSERT INTO team_members
       (id, team_id, name, age, skills_json, employment_status, rate_type, rate_amount, photo_url, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, NOW(), NOW())`,
      [
        id,
        data.teamId,
        data.name,
        data.age ?? null,
        data.skills ? JSON.stringify(data.skills) : '[]',
        data.employmentStatus ?? null,
        data.rateType ?? null,
        data.rateAmount ?? null,
        data.photoUrl ?? null,
      ]
    );

    res.status(201).json({ id });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Invalid payload' });
  }
});

// Update team member
app.put('/api/team-members/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const data = TeamMemberSchema.partial().parse(req.body);

    await query(
      `UPDATE team_members
       SET name = COALESCE($1, name),
           age = COALESCE($2, age),
           skills_json = COALESCE($3::jsonb, skills_json),
           employment_status = COALESCE($4, employment_status),
           rate_type = COALESCE($5, rate_type),
           rate_amount = COALESCE($6, rate_amount),
           photo_url = COALESCE($7, photo_url),
           updated_at = NOW()
       WHERE id = $8`,
      [
        data.name ?? null,
        data.age ?? null,
        data.skills ? JSON.stringify(data.skills) : null,
        data.employmentStatus ?? null,
        data.rateType ?? null,
        data.rateAmount ?? null,
        data.photoUrl ?? null,
        id,
      ]
    );

    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Invalid payload' });
  }
});

// Hard delete team member
app.delete('/api/team-members/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await query(`DELETE FROM team_members WHERE id = $1`, [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});


// Health
app.get('/api/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password required' });
    }
    const rows = await query(
      `SELECT id, username, full_name, role FROM users WHERE username = $1 AND password = $2`,
      [username, password]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = rows[0];
    res.json({ user: { id: user.id, username: user.username, full_name: user.full_name, role: user.role, permissions: [] } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});
export default serverless(app);
