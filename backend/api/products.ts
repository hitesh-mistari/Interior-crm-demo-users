import express from "express";
import { z } from "zod";
import { query, withTransaction } from "../db";

const router = express.Router();

// Zod validation schema
const ProductSchema = z.object({
  name: z.string(),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  defaultRate: z.number().optional().nullable(),
  unit: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  createdBy: z.string().uuid().optional().nullable()
});

const UpdateSchema = ProductSchema.partial();

// ==========================
// GET ALL PRODUCTS
// ==========================
router.get("/products", async (req, res) => {
  try {
    const rows = await query(
      `SELECT *
       FROM products
       WHERE deleted = FALSE
       ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("GET products error:", err);
    res.status(500).json({ error: "Failed to get products" });
  }
});

// ==========================
// GET SINGLE PRODUCT (optional)
// ==========================
router.get("/products/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const rows = await query(`SELECT * FROM products WHERE id = $1`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to get product" });
  }
});

// ==========================
// CREATE
// ==========================
router.post("/products", async (req, res) => {
  try {
    const data = ProductSchema.parse(req.body);

    const result = await query(
      `INSERT INTO products (name, description, category, sku, default_rate, unit, tags, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        data.name,
        data.description ?? null,
        data.category ?? null,
        data.sku ?? null,
        data.defaultRate ?? null,
        data.unit ?? null,
        data.tags ?? null,
        data.createdBy ?? null
      ]
    );

    res.status(201).json(result[0]);
  } catch (err: any) {
    console.error("POST products error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================
// UPDATE
// ==========================
router.put("/products/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const data = UpdateSchema.parse(req.body);

    const sets: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (data.name !== undefined) { sets.push(`name = $${i++}`); values.push(data.name); }
    if (data.description !== undefined) { sets.push(`description = $${i++}`); values.push(data.description ?? null); }
    if (data.category !== undefined) { sets.push(`category = $${i++}`); values.push(data.category ?? null); }
    if (data.sku !== undefined) { sets.push(`sku = $${i++}`); values.push(data.sku ?? null); }
    if (data.defaultRate !== undefined) { sets.push(`default_rate = $${i++}`); values.push(data.defaultRate ?? null); }
    if (data.unit !== undefined) { sets.push(`unit = $${i++}`); values.push(data.unit ?? null); }
    if (data.tags !== undefined) { sets.push(`tags = $${i++}`); values.push(data.tags ?? null); }

    sets.push(`updated_at = NOW()`);

    values.push(id);

    const result = await query(
      `UPDATE products SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`,
      values
    );

    if (result.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(result[0]);

  } catch (err: any) {
    console.error("PUT products error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================
// SOFT DELETE → trash
// ==========================
router.delete("/products/:id", async (req, res) => {
  const id = req.params.id;
  const actorUserId = req.body.actorUserId ?? null;
  const reason = req.body.reason ?? null;

  try {
    const result = await withTransaction(async (client: any) => {
      // get snapshot
      const rows = await client.query(
        `SELECT * FROM products WHERE id = $1 AND deleted = FALSE`,
        [id]
      );
      if (rows.rowCount === 0) throw new Error("Not found");

      const snap = rows.rows[0];

      // mark deleted
      await client.query(
        `UPDATE products
         SET deleted = TRUE, deleted_at = NOW(), deleted_by = $1
         WHERE id = $2`,
        [actorUserId, id]
      );

      // insert trash snapshot
      await client.query(
        `INSERT INTO product_trash (original_id, snapshot_json, deleted_at, deleted_by, reason, retention_until)
         VALUES ($1, $2, NOW(), $3, $4, NOW() + ($5 || ' days')::interval)`,
        [id, JSON.stringify(snap), actorUserId, reason, process.env.TRASH_RETENTION_DAYS || "30"]
      );

      // trash log
      await client.query(
        `INSERT INTO trash_logs (item_type, item_id, action, actor_user_id, reason)
         VALUES ('product', $1, 'move', $2, $3)`,
        [id, actorUserId, reason]
      );

      return { ok: true };
    });

    res.json(result);

  } catch (err: any) {
    console.error("DELETE products error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================
// RESTORE
// ==========================
router.post("/products/:id/restore", async (req, res) => {
  const id = req.params.id;
  const actorUserId = req.body.actorUserId ?? null;

  try {
    const result = await withTransaction(async (client: any) => {
      await client.query(
        `UPDATE products
         SET deleted = FALSE, deleted_at = NULL, deleted_by = NULL
         WHERE id = $1`,
        [id]
      );

      await client.query(`DELETE FROM product_trash WHERE original_id = $1`, [id]);

      await client.query(
        `INSERT INTO trash_logs (item_type, item_id, action, actor_user_id)
         VALUES ('product', $1, 'restore', $2)`,
        [id, actorUserId]
      );

      return { ok: true };
    });

    res.json(result);

  } catch (err: any) {
    console.error("RESTORE products error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================
// TRASH LIST
// ==========================
router.get("/trash/products", async (_req, res) => {
  try {
    const rows = await query(
      `SELECT * FROM product_trash ORDER BY deleted_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("GET trash/products error:", err);
    res.status(500).json({ error: "Failed to get trash list" });
  }
});

// ==========================
// PERMANENT DELETE (PURGE)
// ==========================
router.delete("/trash/products/:id", async (req, res) => {
  const id = req.params.id;
  const actorUserId = req.body.actorUserId ?? null;

  try {
    const result = await withTransaction(async (client: any) => {
      await client.query(`DELETE FROM product_trash WHERE original_id = $1`, [id]);
      await client.query(`DELETE FROM products WHERE id = $1`, [id]);

      await client.query(
        `INSERT INTO trash_logs (item_type, item_id, action, actor_user_id)
         VALUES ('product', $1, 'purge', $2)`,
        [id, actorUserId]
      );

      return { ok: true };
    });

    res.json(result);

  } catch (err: any) {
    console.error("PURGE products error:", err);
    res.status(400).json({ error: err.message });
  }
});

export default router;
