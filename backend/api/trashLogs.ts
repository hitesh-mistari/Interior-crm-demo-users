import express from "express";
import { z } from "zod";
import { query, withTransaction } from "../db";

const router = express.Router();

// Zod validation schema
const TrashLogSchema = z.object({
  itemType: z.string(),
  itemId: z.string().uuid(),
  action: z.enum(["move","restore","purge"]),
  actorUserId: z.string().uuid().optional().nullable(),
  reason: z.string().optional().nullable()
});

const UpdateSchema = TrashLogSchema.partial();

// ==========================
// GET ALL TRASH LOGS
// ==========================
router.get("/trash-logs", async (req, res) => {
  try {
    const rows = await query(
      `SELECT *
       FROM trash_logs
       WHERE deleted = FALSE
       ORDER BY id DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("GET trash-logs error:", err);
    res.status(500).json({ error: "Failed to get trash logs" });
  }
});

// ==========================
// GET SINGLE TRASH LOG (optional)
// ==========================
router.get("/trash-logs/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const rows = await query(`SELECT * FROM trash_logs WHERE id = $1`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to get trash log" });
  }
});

// ==========================
// CREATE
// ==========================
router.post("/trash-logs", async (req, res) => {
  try {
    const data = TrashLogSchema.parse(req.body);

    const result = await query(
      `INSERT INTO trash_logs (item_type, item_id, action, actor_user_id, reason)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [
        data.itemType,
        data.itemId,
        data.action,
        data.actorUserId ?? null,
        data.reason ?? null
      ]
    );

    res.status(201).json(result[0]);
  } catch (err: any) {
    console.error("POST trash-logs error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================
// UPDATE
// ==========================
router.put("/trash-logs/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const data = UpdateSchema.parse(req.body);

    const sets: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (data.itemType !== undefined) { sets.push(`item_type = $${i++}`); values.push(data.itemType); }
    if (data.itemId !== undefined) { sets.push(`item_id = $${i++}`); values.push(data.itemId); }
    if (data.action !== undefined) { sets.push(`action = $${i++}`); values.push(data.action); }
    if (data.actorUserId !== undefined) { sets.push(`actor_user_id = $${i++}`); values.push(data.actorUserId ?? null); }
    if (data.reason !== undefined) { sets.push(`reason = $${i++}`); values.push(data.reason ?? null); }

    sets.push(`updated_at = NOW()`);

    values.push(id);

    const result = await query(
      `UPDATE trash_logs SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`,
      values
    );

    if (result.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(result[0]);

  } catch (err: any) {
    console.error("PUT trash-logs error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================
// SOFT DELETE → trash
// ==========================
router.delete("/trash-logs/:id", async (req, res) => {
  const id = req.params.id;
  const actorUserId = req.body.actorUserId ?? null;
  const reason = req.body.reason ?? null;

  try {
    const result = await withTransaction(async (client: any) => {
      // get snapshot
      const rows = await client.query(
        `SELECT * FROM trash_logs WHERE id = $1 AND deleted = FALSE`,
        [id]
      );
      if (rows.rowCount === 0) throw new Error("Not found");

      const snap = rows.rows[0];

      // mark deleted
      await client.query(
        `UPDATE trash_logs
         SET deleted = TRUE, deleted_at = NOW(), deleted_by = $1
         WHERE id = $2`,
        [actorUserId, id]
      );

      // insert trash snapshot
      await client.query(
        `INSERT INTO trash_log_trash (original_id, snapshot_json, deleted_at, deleted_by, reason, retention_until)
         VALUES ($1, $2, NOW(), $3, $4, NOW() + ($5 || ' days')::interval)`,
        [id, JSON.stringify(snap), actorUserId, reason, process.env.TRASH_RETENTION_DAYS || "30"]
      );

      // trash log
      await client.query(
        `INSERT INTO trash_logs (item_type, item_id, action, actor_user_id, reason)
         VALUES ('trash_log', $1, 'move', $2, $3)`,
        [id, actorUserId, reason]
      );

      return { ok: true };
    });

    res.json(result);

  } catch (err: any) {
    console.error("DELETE trash-logs error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================
// RESTORE
// ==========================
router.post("/trash-logs/:id/restore", async (req, res) => {
  const id = req.params.id;
  const actorUserId = req.body.actorUserId ?? null;

  try {
    const result = await withTransaction(async (client: any) => {
      await client.query(
        `UPDATE trash_logs
         SET deleted = FALSE, deleted_at = NULL, deleted_by = NULL
         WHERE id = $1`,
        [id]
      );

      await client.query(`DELETE FROM trash_log_trash WHERE original_id = $1`, [id]);

      await client.query(
        `INSERT INTO trash_logs (item_type, item_id, action, actor_user_id)
         VALUES ('trash_log', $1, 'restore', $2)`,
        [id, actorUserId]
      );

      return { ok: true };
    });

    res.json(result);

  } catch (err: any) {
    console.error("RESTORE trash-logs error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================
// TRASH LIST
// ==========================
router.get("/trash/trash-logs", async (_req, res) => {
  try {
    const rows = await query(
      `SELECT * FROM trash_log_trash ORDER BY deleted_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("GET trash/trash-logs error:", err);
    res.status(500).json({ error: "Failed to get trash list" });
  }
});

// ==========================
// PERMANENT DELETE (PURGE)
// ==========================
router.delete("/trash/trash-logs/:id", async (req, res) => {
  const id = req.params.id;
  const actorUserId = req.body.actorUserId ?? null;

  try {
    const result = await withTransaction(async (client: any) => {
      await client.query(`DELETE FROM trash_log_trash WHERE original_id = $1`, [id]);
      await client.query(`DELETE FROM trash_logs WHERE id = $1`, [id]);

      await client.query(
        `INSERT INTO trash_logs (item_type, item_id, action, actor_user_id)
         VALUES ('trash_log', $1, 'purge', $2)`,
        [id, actorUserId]
      );

      return { ok: true };
    });

    res.json(result);

  } catch (err: any) {
    console.error("PURGE trash-logs error:", err);
    res.status(400).json({ error: err.message });
  }
});

export default router;
