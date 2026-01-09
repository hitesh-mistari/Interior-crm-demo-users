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
// DELETE (HARD)
// ==========================
router.delete("/materials/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const result = await query(
      `DELETE FROM materials WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.length === 0) return res.status(404).json({ error: "Not found" });

    res.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE materials error:", err);
    res.status(400).json({ error: err.message });
  }
});

export default router;
