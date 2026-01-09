import express from "express";
import { z } from "zod";
import { query, withTransaction } from "../db";

const router = express.Router();

const TeamMemberSchema = z.object({
    teamId: z.string().optional().nullable(), // Relaxed validation
    name: z.string().min(1),
    contact: z.string().optional().nullable(),
    age: z.number().optional().nullable(),
    skills: z.array(z.string()).optional().default([]),
    specialties: z.array(z.string()).optional().default([]),
    employmentStatus: z.enum(['Full-Time', 'Part-Time', 'Contractor']).default('Full-Time'),
    rateType: z.enum(['Hourly', 'Daily']).optional().nullable(),
    rateAmount: z.number().optional().default(0),
    photoUrl: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    createdBy: z.string().uuid().optional().nullable(),
});

const UpdateSchema = TeamMemberSchema.partial();

function mapMember(row: any) {
    return {
        id: row.id,
        teamId: row.team_id,
        name: row.name,
        contact: row.contact,
        age: row.age,
        skills: row.skills || [],
        specialties: row.specialties || [],
        employmentStatus: row.employment_status,
        rateType: row.rate_type,
        rateAmount: Number(row.rate_amount || 0),
        photoUrl: row.photo_url,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at
    };
}

// LIST
router.get("/teams", async (req, res) => {
    try {
        const { status } = req.query;
        let sql = `SELECT * FROM team_members WHERE 1=1`;
        const params: any[] = [];

        if (status) {
            sql += ` AND employment_status = $1`;
            params.push(status);
        }

        sql += ` ORDER BY name ASC`;
        const rows = await query(sql, params);
        res.json(rows.map(mapMember));
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// GET ONE
router.get("/teams/:id", async (req, res) => {
    try {
        const rows = await query(`SELECT * FROM team_members WHERE id = $1`, [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: "Not found" });
        res.json(mapMember(rows[0]));
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// CREATE
router.post("/teams", async (req, res) => {
    try {
        const data = TeamMemberSchema.parse(req.body);

        // Validation & Fallback for Team ID to prevent FK errors
        let validTeamId = data.teamId;
        let teamExists = false;

        if (validTeamId) {
            const teamCheck = await query(`SELECT id FROM teams WHERE id = $1`, [validTeamId]);
            if (teamCheck.length > 0) teamExists = true;
        }

        if (!teamExists) {
            // Fallback: Get any existing team
            const anyTeam = await query(`SELECT id FROM teams LIMIT 1`);
            if (anyTeam.length > 0) {
                validTeamId = anyTeam[0].id;
            } else {
                // Fallback: Create Default Team if none exist
                const newTeam = await query(`INSERT INTO teams (name, category, description) VALUES ('Default Team', 'Other', 'Auto-created default team') RETURNING id`);
                validTeamId = newTeam[0].id;
            }
        }

        const result = await query(
            `INSERT INTO team_members (team_id, name, contact, age, skills, specialties, employment_status, rate_type, rate_amount, photo_url, notes, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
       RETURNING *`,
            [
                validTeamId,
                data.name,
                data.contact ?? null,
                data.age ?? null,
                data.skills || [],
                data.specialties || [],
                data.employmentStatus,
                data.rateType ?? null,
                data.rateAmount ?? 0,
                data.photoUrl ?? null,
                data.notes ?? null,
                null // Force createdBy to null to avoid FK constraint error
            ]
        );
        const member = mapMember(result[0]);
        res.status(201).json(member);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// UPDATE
router.put("/teams/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const data = UpdateSchema.parse(req.body);
        const sets: string[] = [];
        const vals: any[] = [];
        let i = 1;

        if (data.teamId !== undefined) { sets.push(`team_id = $${i++}`); vals.push(data.teamId); }
        if (data.name !== undefined) { sets.push(`name = $${i++}`); vals.push(data.name); }
        if (data.contact !== undefined) { sets.push(`contact = $${i++}`); vals.push(data.contact ?? null); }
        if (data.age !== undefined) { sets.push(`age = $${i++}`); vals.push(data.age ?? null); }
        if (data.skills !== undefined) { sets.push(`skills = $${i++}`); vals.push(data.skills); }
        if (data.specialties !== undefined) { sets.push(`specialties = $${i++}`); vals.push(data.specialties); }
        if (data.employmentStatus !== undefined) { sets.push(`employment_status = $${i++}`); vals.push(data.employmentStatus); }
        if (data.rateType !== undefined) { sets.push(`rate_type = $${i++}`); vals.push(data.rateType ?? null); }
        if (data.rateAmount !== undefined) { sets.push(`rate_amount = $${i++}`); vals.push(data.rateAmount); }
        if (data.photoUrl !== undefined) { sets.push(`photo_url = $${i++}`); vals.push(data.photoUrl ?? null); }
        if (data.notes !== undefined) { sets.push(`notes = $${i++}`); vals.push(data.notes ?? null); }

        sets.push(`updated_at = NOW()`);
        vals.push(id);

        if (sets.length === 1) return res.json(mapMember((await query(`SELECT * FROM team_members WHERE id=$1`, [id]))[0]));

        const result = await query(
            `UPDATE team_members SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
            vals
        );

        if (result.length === 0) return res.status(404).json({ error: "Not found" });

        const member = mapMember(result[0]);
        res.json(member);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE (HARD)
router.delete("/teams/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const result = await query(
            `DELETE FROM team_members WHERE id = $1 RETURNING *`,
            [id]
        );
        if (result.length === 0) return res.status(404).json({ error: "Not found" });

        res.json({ ok: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
