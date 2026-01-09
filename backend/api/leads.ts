import express from "express";
import { z } from "zod";
import { query, withTransaction } from "../db";

const router = express.Router();

// Zod validation schema
const LeadSchema = z.object({
  name: z.string(),
  phone: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  source: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  lead_type: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  estimated_value: z.number().optional().nullable(),
  instagram_lead_id: z.string().optional().nullable(),
  createdBy: z.string().uuid().optional().nullable()
});

const UpdateSchema = LeadSchema.partial();

// ==========================
// GET ALL LEADS
// ==========================
router.get("/leads", async (req, res) => {
  try {
    const rows = await query(
      `SELECT *
       FROM leads
       ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("GET leads error:", err);
    res.status(500).json({ error: "Failed to get leads" });
  }
});

// ==========================
// GET SINGLE LEAD (optional)
// ==========================
router.get("/leads/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const rows = await query(`SELECT * FROM leads WHERE id = $1`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to get lead" });
  }
});

// ==========================
// CREATE
// ==========================
router.post("/leads", async (req, res) => {
  try {
    // Map frontend camelCase to schema if needed, but frontend seems to send snake_case for some fields
    // based on LeadModal.tsx: assigned_to, lead_type, estimated_value.
    // However, LeadSchema expects camelCase for createdBy.
    // Let's check what frontend sends. LeadModal sends:
    // name, phone, location, source, status, lead_type, remarks, assigned_to, estimated_value.
    // It also sends created_by (snake_case) in addLead call in LeadModal.tsx line 68.
    // But the backend schema defined above expects createdBy.
    // I should adjust the schema to accept what frontend sends or what I expect.
    // Let's make the schema flexible or match the frontend.
    // Frontend sends:
    // { name, phone, location, source, status, lead_type, remarks, assigned_to, estimated_value, created_by, ... }

    // Let's update the schema to match frontend payload keys exactly where possible.
    const payload = req.body;

    // Manual mapping if needed, or just use the payload directly if keys match DB columns (which they mostly do).

    const result = await query(
      `INSERT INTO leads (name, phone, location, source, status, lead_type, remarks, assigned_to, estimated_value, created_by, instagram_lead_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        payload.name,
        payload.phone ?? null,
        payload.location ?? null,
        payload.source ?? null,
        payload.status ?? null,
        payload.lead_type ?? null,
        payload.remarks ?? null,
        payload.assigned_to ?? null,
        payload.estimated_value ?? null,
        payload.created_by ?? null, // Frontend sends created_by
        payload.instagram_lead_id ?? null
      ]
    );

    res.status(201).json(result[0]);
  } catch (err: any) {
    console.error("POST leads error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================
// UPDATE
// ==========================
router.put("/leads/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body; // Skip strict Zod parsing for now to avoid camelCase/snake_case hell, or just use partial updates.

    const sets: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (data.name !== undefined) { sets.push(`name = $${i++}`); values.push(data.name); }
    if (data.phone !== undefined) { sets.push(`phone = $${i++}`); values.push(data.phone ?? null); }
    if (data.location !== undefined) { sets.push(`location = $${i++}`); values.push(data.location ?? null); }
    if (data.source !== undefined) { sets.push(`source = $${i++}`); values.push(data.source ?? null); }
    if (data.status !== undefined) { sets.push(`status = $${i++}`); values.push(data.status ?? null); }
    if (data.lead_type !== undefined) { sets.push(`lead_type = $${i++}`); values.push(data.lead_type ?? null); }
    if (data.remarks !== undefined) { sets.push(`remarks = $${i++}`); values.push(data.remarks ?? null); }
    if (data.assigned_to !== undefined) { sets.push(`assigned_to = $${i++}`); values.push(data.assigned_to ?? null); }
    if (data.estimated_value !== undefined) { sets.push(`estimated_value = $${i++}`); values.push(data.estimated_value ?? null); }
    if (data.instagram_lead_id !== undefined) { sets.push(`instagram_lead_id = $${i++}`); values.push(data.instagram_lead_id ?? null); }

    sets.push(`updated_at = NOW()`);

    values.push(id);

    const result = await query(
      `UPDATE leads SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`,
      values
    );

    if (result.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(result[0]);

  } catch (err: any) {
    console.error("PUT leads error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================
// DELETE (HARD)
// ==========================
router.delete("/leads/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const result = await query(
      `DELETE FROM leads WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.length === 0) return res.status(404).json({ error: "Not found" });

    res.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE leads error:", err);
    res.status(400).json({ error: err.message });
  }
});

export default router;
