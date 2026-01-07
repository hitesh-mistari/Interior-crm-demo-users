import express from "express";
import { z } from "zod";
import { query, withTransaction } from "../db";

const router = express.Router();

// Zod validation schema
const MaterialSchema = z.object({
  itemName: z.string(),
  quantity: z.number().optional().nullable(),
  unit: z.string().optional().nullable(),
  rate: z.number().optional().nullable(),
  amount: z.number().optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  vendor: z.string().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  createdBy: z.string().uuid().optional().nullable()
});

const UpdateSchema = MaterialSchema.partial();

// ==========================
// GET ALL MATERIALS
// ==========================
router.get("/materials", async (req, res) => {
  try {
    const rows = await query(
      `SELECT *
       FROM materials
       WHERE deleted = FALSE
       ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("GET materials error:", err);
    res.status(500).json({ error: "Failed to get materials" });
  }
});

// ==========================
// GET SINGLE MATERIAL (optional)
// ==========================
router.get("/materials/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const rows = await query(`SELECT * FROM materials WHERE id = $1`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to get material" });
  }
});

// ==========================
// CREATE
// ==========================
router.post("/materials", async (req, res) => {
  try {
    const data = MaterialSchema.parse(req.body);

    const result = await query(
      `INSERT INTO materials (name, description, category, unit, unit_price, currency, supplier_id, min_stock, current_stock, location, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        data.itemName,
        null,
        null,
        data.unit ?? null,
        data.rate ?? null,
        null,
        null,
        null,
        data.quantity ?? null,
        data.vendor ?? null,
        data.createdBy ?? null
      ]
    );

    res.status(201).json(result[0]);
  } catch (err: any) {
    console.error("POST materials error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================
// UPDATE
// ==========================
router.put("/materials/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const data = UpdateSchema.parse(req.body);

    const sets: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (data.itemName !== undefined) { sets.push(`name = $${i++}`); values.push(data.itemName); }
    if (data.unit !== undefined) { sets.push(`unit = $${i++}`); values.push(data.unit ?? null); }
    if (data.rate !== undefined) { sets.push(`unit_price = $${i++}`); values.push(data.rate ?? null); }
    if (data.quantity !== undefined) { sets.push(`current_stock = $${i++}`); values.push(data.quantity ?? null); }
    if (data.vendor !== undefined) { sets.push(`location = $${i++}`); values.push(data.vendor ?? null); }

    sets.push(`updated_at = NOW()`);

    values.push(id);

    const result = await query(
      `UPDATE materials SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`,
      values
    );

    if (result.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(result[0]);

  } catch (err: any) {
    console.error("PUT materials error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================
// SOFT DELETE → trash
// ==========================
router.delete("/materials/:id", async (req, res) => {
  const id = req.params.id;
  const actorUserId = req.body.actorUserId ?? null;
  const reason = req.body.reason ?? null;

  try {
    const result = await withTransaction(async (client: any) => {
      // get snapshot
      const rows = await client.query(
        `SELECT * FROM materials WHERE id = $1 AND deleted = FALSE`,
        [id]
      );
      if (rows.rowCount === 0) throw new Error("Not found");

      const snap = rows.rows[0];

      // mark deleted
      await client.query(
        `UPDATE materials
         SET deleted = TRUE, deleted_at = NOW(), deleted_by = $1
         WHERE id = $2`,
        [actorUserId, id]
      );

      // insert trash snapshot
      await client.query(
        `INSERT INTO material_trash (original_id, snapshot_json, deleted_at, deleted_by, reason, retention_until)
         VALUES ($1, $2, NOW(), $3, $4, NOW() + ($5 || ' days')::interval)`,
        [id, JSON.stringify(snap), actorUserId, reason, process.env.TRASH_RETENTION_DAYS || "30"]
      );

      // trash log
      await client.query(
        `INSERT INTO trash_logs (item_type, item_id, action, actor_user_id, reason)
         VALUES ('material', $1, 'move', $2, $3)`,
        [id, actorUserId, reason]
      );

      return { ok: true };
    });

    res.json(result);

  } catch (err: any) {
    console.error("DELETE materials error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================
// RESTORE
// ==========================
router.post("/materials/:id/restore", async (req, res) => {
  const id = req.params.id;
  const actorUserId = req.body.actorUserId ?? null;

  try {
    const result = await withTransaction(async (client: any) => {
      await client.query(
        `UPDATE materials
         SET deleted = FALSE, deleted_at = NULL, deleted_by = NULL
         WHERE id = $1`,
        [id]
      );

      await client.query(`DELETE FROM material_trash WHERE original_id = $1`, [id]);

      await client.query(
        `INSERT INTO trash_logs (item_type, item_id, action, actor_user_id)
         VALUES ('material', $1, 'restore', $2)`,
        [id, actorUserId]
      );

      return { ok: true };
    });

    res.json(result);

  } catch (err: any) {
    console.error("RESTORE materials error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================
// TRASH LIST
// ==========================
router.get("/trash/materials", async (_req, res) => {
  try {
    const rows = await query(
      `SELECT * FROM material_trash ORDER BY deleted_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("GET trash/materials error:", err);
    res.status(500).json({ error: "Failed to get trash list" });
  }
});

// ==========================
// PERMANENT DELETE (PURGE)
// ==========================
router.delete("/trash/materials/:id", async (req, res) => {
  const id = req.params.id;
  const actorUserId = req.body.actorUserId ?? null;

  try {
    const result = await withTransaction(async (client: any) => {
      await client.query(`DELETE FROM material_trash WHERE original_id = $1`, [id]);
      await client.query(`DELETE FROM materials WHERE id = $1`, [id]);

      await client.query(
        `INSERT INTO trash_logs (item_type, item_id, action, actor_user_id)
         VALUES ('material', $1, 'purge', $2)`,
        [id, actorUserId]
      );

      return { ok: true };
    });

    res.json(result);

  } catch (err: any) {
    console.error("PURGE materials error:", err);
    res.status(400).json({ error: err.message });
  }
});

export default router;
