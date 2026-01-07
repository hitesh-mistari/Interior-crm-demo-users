import express from "express";
import { z } from "zod";
import { query, withTransaction } from "../db";

const router = express.Router();

// Zod validation schema
const LeadFollowUpSchema = z.object({
  leadId: z.string().uuid(),
  interactionId: z.string().uuid().optional().nullable(),
  followUpType: z.enum(["Call","Email","Meeting","SMS","Reminder"]),
  subject: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  scheduledDate: z.string().optional().nullable(),
  completedDate: z.string().optional().nullable(),
  status: z.enum(["Scheduled","Completed","Cancelled","Overdue"]).optional().nullable(),
  priority: z.enum(["Low","Medium","High","Urgent"]).optional().nullable(),
  assignedTo: z.string().uuid().optional().nullable(),
  createdBy: z.string().uuid().optional().nullable()
});

const UpdateSchema = LeadFollowUpSchema.partial();

// ==========================
// GET ALL LEAD FOLLOW UPS
// ==========================
router.get("/lead-follow-ups", async (req, res) => {
  try {
    const rows = await query(
      `SELECT *
       FROM lead_follow_ups
       WHERE deleted = FALSE
       ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("GET lead-follow-ups error:", err);
    res.status(500).json({ error: "Failed to get lead follow ups" });
  }
});

// ==========================
// GET SINGLE LEAD FOLLOW UP (optional)
// ==========================
router.get("/lead-follow-ups/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const rows = await query(`SELECT * FROM lead_follow_ups WHERE id = $1`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to get lead follow up" });
  }
});

// ==========================
// CREATE
// ==========================
router.post("/lead-follow-ups", async (req, res) => {
  try {
    const data = LeadFollowUpSchema.parse(req.body);

    const result = await query(
      `INSERT INTO lead_follow_ups (lead_id, interaction_id, follow_up_type, subject, notes, scheduled_date, completed_date, status, priority, assigned_to, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        data.leadId,
        data.interactionId ?? null,
        data.followUpType,
        data.subject ?? null,
        data.notes ?? null,
        data.scheduledDate ?? null,
        data.completedDate ?? null,
        data.status ?? null,
        data.priority ?? null,
        data.assignedTo ?? null,
        data.createdBy ?? null
      ]
    );

    res.status(201).json(result[0]);
  } catch (err: any) {
    console.error("POST lead-follow-ups error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================
// UPDATE
// ==========================
router.put("/lead-follow-ups/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const data = UpdateSchema.parse(req.body);

    const sets: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (data.leadId !== undefined) { sets.push(`lead_id = $${i++}`); values.push(data.leadId); }
    if (data.interactionId !== undefined) { sets.push(`interaction_id = $${i++}`); values.push(data.interactionId ?? null); }
    if (data.followUpType !== undefined) { sets.push(`follow_up_type = $${i++}`); values.push(data.followUpType); }
    if (data.subject !== undefined) { sets.push(`subject = $${i++}`); values.push(data.subject ?? null); }
    if (data.notes !== undefined) { sets.push(`notes = $${i++}`); values.push(data.notes ?? null); }
    if (data.scheduledDate !== undefined) { sets.push(`scheduled_date = $${i++}`); values.push(data.scheduledDate ?? null); }
    if (data.completedDate !== undefined) { sets.push(`completed_date = $${i++}`); values.push(data.completedDate ?? null); }
    if (data.status !== undefined) { sets.push(`status = $${i++}`); values.push(data.status ?? null); }
    if (data.priority !== undefined) { sets.push(`priority = $${i++}`); values.push(data.priority ?? null); }
    if (data.assignedTo !== undefined) { sets.push(`assigned_to = $${i++}`); values.push(data.assignedTo ?? null); }

    sets.push(`updated_at = NOW()`);

    values.push(id);

    const result = await query(
      `UPDATE lead_follow_ups SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`,
      values
    );

    if (result.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(result[0]);

  } catch (err: any) {
    console.error("PUT lead-follow-ups error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================
// SOFT DELETE → trash
// ==========================
router.delete("/lead-follow-ups/:id", async (req, res) => {
  const id = req.params.id;
  const actorUserId = req.body.actorUserId ?? null;
  const reason = req.body.reason ?? null;

  try {
    const result = await withTransaction(async (client: any) => {
      // get snapshot
      const rows = await client.query(
        `SELECT * FROM lead_follow_ups WHERE id = $1 AND deleted = FALSE`,
        [id]
      );
      if (rows.rowCount === 0) throw new Error("Not found");

      const snap = rows.rows[0];

      // mark deleted
      await client.query(
        `UPDATE lead_follow_ups
         SET deleted = TRUE, deleted_at = NOW(), deleted_by = $1
         WHERE id = $2`,
        [actorUserId, id]
      );

      // insert trash snapshot
      await client.query(
        `INSERT INTO lead_follow_up_trash (original_id, snapshot_json, deleted_at, deleted_by, reason, retention_until)
         VALUES ($1, $2, NOW(), $3, $4, NOW() + ($5 || ' days')::interval)`,
        [id, JSON.stringify(snap), actorUserId, reason, process.env.TRASH_RETENTION_DAYS || "30"]
      );

      // trash log
      await client.query(
        `INSERT INTO trash_logs (item_type, item_id, action, actor_user_id, reason)
         VALUES ('lead_follow_up', $1, 'move', $2, $3)`,
        [id, actorUserId, reason]
      );

      return { ok: true };
    });

    res.json(result);

  } catch (err: any) {
    console.error("DELETE lead-follow-ups error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================
// RESTORE
// ==========================
router.post("/lead-follow-ups/:id/restore", async (req, res) => {
  const id = req.params.id;
  const actorUserId = req.body.actorUserId ?? null;

  try {
    const result = await withTransaction(async (client: any) => {
      await client.query(
        `UPDATE lead_follow_ups
         SET deleted = FALSE, deleted_at = NULL, deleted_by = NULL
         WHERE id = $1`,
        [id]
      );

      await client.query(`DELETE FROM lead_follow_up_trash WHERE original_id = $1`, [id]);

      await client.query(
        `INSERT INTO trash_logs (item_type, item_id, action, actor_user_id)
         VALUES ('lead_follow_up', $1, 'restore', $2)`,
        [id, actorUserId]
      );

      return { ok: true };
    });

    res.json(result);

  } catch (err: any) {
    console.error("RESTORE lead-follow-ups error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================
// TRASH LIST
// ==========================
router.get("/trash/lead-follow-ups", async (_req, res) => {
  try {
    const rows = await query(
      `SELECT * FROM lead_follow_up_trash ORDER BY deleted_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("GET trash/lead-follow-ups error:", err);
    res.status(500).json({ error: "Failed to get trash list" });
  }
});

// ==========================
// PERMANENT DELETE (PURGE)
// ==========================
router.delete("/trash/lead-follow-ups/:id", async (req, res) => {
  const id = req.params.id;
  const actorUserId = req.body.actorUserId ?? null;

  try {
    const result = await withTransaction(async (client: any) => {
      await client.query(`DELETE FROM lead_follow_up_trash WHERE original_id = $1`, [id]);
      await client.query(`DELETE FROM lead_follow_ups WHERE id = $1`, [id]);

      await client.query(
        `INSERT INTO trash_logs (item_type, item_id, action, actor_user_id)
         VALUES ('lead_follow_up', $1, 'purge', $2)`,
        [id, actorUserId]
      );

      return { ok: true };
    });

    res.json(result);

  } catch (err: any) {
    console.error("PURGE lead-follow-ups error:", err);
    res.status(400).json({ error: err.message });
  }
});

export default router;