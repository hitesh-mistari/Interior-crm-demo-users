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
// DELETE (HARD)
// ==========================
router.delete("/products/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const result = await query(
      `DELETE FROM products WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.length === 0) return res.status(404).json({ error: "Not found" });

    res.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE products error:", err);
    res.status(400).json({ error: err.message });
  }
});

export default router;
