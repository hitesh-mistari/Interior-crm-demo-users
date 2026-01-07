import express from "express";
import { z } from "zod";
import { query, withTransaction } from "../db";

const router = express.Router();

// Zod validation schema
const LeadInteractionSchema = z.object({
  leadId: z.string().uuid(),
  type: z.enum(["Call","Email","Meeting","SMS","Social Media","Other"]),
  subject: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
  interactionDate: z.string().optional().nullable(),
  duration: z.number().optional().nullable(),
  outcome: z.enum(["Positive","Neutral","Negative","No Response"]).optional().nullable(),
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
       WHERE deleted = FALSE
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
// SOFT DELETE → trash
// ==========================
router.delete("/lead-interactions/:id", async (req, res) => {
  const id = req.params.id;
  const actorUserId = req.body.actorUserId ?? null;
  const reason = req.body.reason ?? null;

  try {
    const result = await withTransaction(async (client: any) => {
      // get snapshot
      const rows = await client.query(
        `SELECT * FROM lead_interactions WHERE id = $1 AND deleted = FALSE`,
        [id]
      );
      if (rows.rowCount === 0) throw new Error("Not found");

      const snap = rows.rows[0];

      // mark deleted
      await client.query(
        `UPDATE lead_interactions
         SET deleted = TRUE, deleted_at = NOW(), deleted_by = $1
         WHERE id = $2`,
        [actorUserId, id]
      );

      // insert trash snapshot
      await client.query(
        `INSERT INTO lead_interaction_trash (original_id, snapshot_json, deleted_at, deleted_by, reason, retention_until)
         VALUES ($1, $2, NOW(), $3, $4, NOW() + ($5 || ' days')::interval)`,
        [id, JSON.stringify(snap), actorUserId, reason, process.env.TRASH_RETENTION_DAYS || "30"]
      );

      // trash log
      await client.query(
        `INSERT INTO trash_logs (item_type, item_id, action, actor_user_id, reason)
         VALUES ('lead_interaction', $1, 'move', $2, $3)`,
        [id, actorUserId, reason]
      );

      return { ok: true };
    });

    res.json(result);

  } catch (err: any) {
    console.error("DELETE lead-interactions error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================
// RESTORE
// ==========================
router.post("/lead-interactions/:id/restore", async (req, res) => {
  const id = req.params.id;
  const actorUserId = req.body.actorUserId ?? null;

  try {
    const result = await withTransaction(async (client: any) => {
      await client.query(
        `UPDATE lead_interactions
         SET deleted = FALSE, deleted_at = NULL, deleted_by = NULL
         WHERE id = $1`,
        [id]
      );

      await client.query(`DELETE FROM lead_interaction_trash WHERE original_id = $1`, [id]);

      await client.query(
        `INSERT INTO trash_logs (item_type, item_id, action, actor_user_id)
         VALUES ('lead_interaction', $1, 'restore', $2)`,
        [id, actorUserId]
      );

      return { ok: true };
    });

    res.json(result);

  } catch (err: any) {
    console.error("RESTORE lead-interactions error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================
// TRASH LIST
// ==========================
router.get("/trash/lead-interactions", async (_req, res) => {
  try {
    const rows = await query(
      `SELECT * FROM lead_interaction_trash ORDER BY deleted_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("GET trash/lead-interactions error:", err);
    res.status(500).json({ error: "Failed to get trash list" });
  }
});

// ==========================
// PERMANENT DELETE (PURGE)
// ==========================
router.delete("/trash/lead-interactions/:id", async (req, res) => {
  const id = req.params.id;
  const actorUserId = req.body.actorUserId ?? null;

  try {
    const result = await withTransaction(async (client: any) => {
      await client.query(`DELETE FROM lead_interaction_trash WHERE original_id = $1`, [id]);
      await client.query(`DELETE FROM lead_interactions WHERE id = $1`, [id]);

      await client.query(
        `INSERT INTO trash_logs (item_type, item_id, action, actor_user_id)
         VALUES ('lead_interaction', $1, 'purge', $2)`,
        [id, actorUserId]
      );

      return { ok: true };
    });

    res.json(result);

  } catch (err: any) {
    console.error("PURGE lead-interactions error:", err);
    res.status(400).json({ error: err.message });
  }
});

export default router;