import express from "express";
import { z } from "zod";
import { query, withTransaction } from "../db";

const router = express.Router();

// Zod validation schema
const LeadInteractionSchema = z.object({
  leadId: z.string().uuid(),
  type: z.enum(["Call", "Email", "Meeting", "SMS", "Social Media", "Other"]),
  subject: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  interactionDate: z.string().optional().nullable(),
  duration: z.number().optional().nullable(),
  outcome: z.enum(["Positive", "Neutral", "Negative", "No Response"]).optional().nullable(),
  nextAction: z.string().optional().nullable(),
  nextActionDate: z.string().optional().nullable(),
  createdBy: z.string().uuid().optional().nullable()
});

const UpdateSchema = LeadInteractionSchema.partial();

// ==========================
// GET ALL LEAD INTERACTIONS
// ==========================
router.get("/lead-interactions", async (req, res) => {
  try {
    const rows = await query(
      `SELECT *
       FROM lead_interactions
       ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("GET lead-interactions error:", err);
    res.status(500).json({ error: "Failed to get lead interactions" });
  }
});

// ==========================
// GET SINGLE LEAD INTERACTION (optional)
// ==========================
router.get("/lead-interactions/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const rows = await query(`SELECT * FROM lead_interactions WHERE id = $1`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to get lead interaction" });
  }
});

// ==========================
// CREATE
// ==========================
router.post("/lead-interactions", async (req, res) => {
  try {
    const data = LeadInteractionSchema.parse(req.body);

    const result = await query(
      `INSERT INTO lead_interactions (lead_id, type, subject, content, interaction_date, duration, outcome, next_action, next_action_date, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        data.leadId,
        data.type,
        data.subject ?? null,
        data.content ?? null,
        data.interactionDate ?? null,
        data.duration ?? null,
        data.outcome ?? null,
        data.nextAction ?? null,
        data.nextActionDate ?? null,
        data.createdBy ?? null
      ]
    );

    res.status(201).json(result[0]);
  } catch (err: any) {
    console.error("POST lead-interactions error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================
// UPDATE
// ==========================
router.put("/lead-interactions/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const data = UpdateSchema.parse(req.body);

    const sets: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (data.leadId !== undefined) { sets.push(`lead_id = $${i++}`); values.push(data.leadId); }
    if (data.type !== undefined) { sets.push(`type = $${i++}`); values.push(data.type); }
    if (data.subject !== undefined) { sets.push(`subject = $${i++}`); values.push(data.subject ?? null); }
    if (data.content !== undefined) { sets.push(`content = $${i++}`); values.push(data.content ?? null); }
    if (data.interactionDate !== undefined) { sets.push(`interaction_date = $${i++}`); values.push(data.interactionDate ?? null); }
    if (data.duration !== undefined) { sets.push(`duration = $${i++}`); values.push(data.duration ?? null); }
    if (data.outcome !== undefined) { sets.push(`outcome = $${i++}`); values.push(data.outcome ?? null); }
    if (data.nextAction !== undefined) { sets.push(`next_action = $${i++}`); values.push(data.nextAction ?? null); }
    if (data.nextActionDate !== undefined) { sets.push(`next_action_date = $${i++}`); values.push(data.nextActionDate ?? null); }

    sets.push(`updated_at = NOW()`);

    values.push(id);

    const result = await query(
      `UPDATE lead_interactions SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`,
      values
    );

    if (result.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(result[0]);

  } catch (err: any) {
    console.error("PUT lead-interactions error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================
// DELETE (HARD)
// ==========================
router.delete("/lead-interactions/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const result = await query(
      `DELETE FROM lead_interactions WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.length === 0) return res.status(404).json({ error: "Not found" });

    res.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE lead-interactions error:", err);
    res.status(400).json({ error: err.message });
  }
});

export default router;