import express from "express";
import { z } from "zod";
import { query, withTransaction } from "../db";

const router = express.Router();

// Zod validation schema
const NotificationSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(["Info", "Success", "Warning", "Error", "Task", "Message"]),
  title: z.string(),
  message: z.string(),
  isRead: z.boolean().optional().nullable(),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]).optional().nullable(),
  actionUrl: z.string().optional().nullable(),
  actionText: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  createdBy: z.string().uuid().optional().nullable()
});

const UpdateSchema = NotificationSchema.partial();

// ==========================
// GET ALL NOTIFICATIONS
// ==========================
router.get("/notifications", async (req, res) => {
  try {
    const rows = await query(
      `SELECT *
       FROM notifications
       ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("GET notifications error:", err);
    res.status(500).json({ error: "Failed to get notifications" });
  }
});

// ==========================
// GET SINGLE NOTIFICATION (optional)
// ==========================
router.get("/notifications/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const rows = await query(`SELECT * FROM notifications WHERE id = $1`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to get notification" });
  }
});

// ==========================
// CREATE
// ==========================
router.post("/notifications", async (req, res) => {
  try {
    const data = NotificationSchema.parse(req.body);

    const result = await query(
      `INSERT INTO notifications (user_id, type, title, message, is_read, priority, action_url, action_text, expires_at, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        data.userId,
        data.type,
        data.title,
        data.message,
        data.isRead ?? false,
        data.priority ?? null,
        data.actionUrl ?? null,
        data.actionText ?? null,
        data.expiresAt ?? null,
        data.createdBy ?? null
      ]
    );

    res.status(201).json(result[0]);
  } catch (err: any) {
    console.error("POST notifications error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================
// UPDATE
// ==========================
router.put("/notifications/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const data = UpdateSchema.parse(req.body);

    const sets: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (data.userId !== undefined) { sets.push(`user_id = $${i++}`); values.push(data.userId); }
    if (data.type !== undefined) { sets.push(`type = $${i++}`); values.push(data.type); }
    if (data.title !== undefined) { sets.push(`title = $${i++}`); values.push(data.title); }
    if (data.message !== undefined) { sets.push(`message = $${i++}`); values.push(data.message); }
    if (data.isRead !== undefined) { sets.push(`is_read = $${i++}`); values.push(data.isRead); }
    if (data.priority !== undefined) { sets.push(`priority = $${i++}`); values.push(data.priority ?? null); }
    if (data.actionUrl !== undefined) { sets.push(`action_url = $${i++}`); values.push(data.actionUrl ?? null); }
    if (data.actionText !== undefined) { sets.push(`action_text = $${i++}`); values.push(data.actionText ?? null); }
    if (data.expiresAt !== undefined) { sets.push(`expires_at = $${i++}`); values.push(data.expiresAt ?? null); }

    sets.push(`updated_at = NOW()`);

    values.push(id);

    const result = await query(
      `UPDATE notifications SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`,
      values
    );

    if (result.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(result[0]);

  } catch (err: any) {
    console.error("PUT notifications error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================
// DELETE (HARD)
// ==========================
router.delete("/notifications/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const result = await query(
      `DELETE FROM notifications WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.length === 0) return res.status(404).json({ error: "Not found" });

    res.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE notifications error:", err);
    res.status(400).json({ error: err.message });
  }
});

export default router;