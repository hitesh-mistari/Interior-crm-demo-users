import express from "express";
import { z } from "zod";
import { query, withTransaction } from "../db";

const router = express.Router();

// Zod validation schema
const SupplierSchema = z.object({
  supplierName: z.string(),
  companyName: z.string().optional().nullable(),
  phone: z.string(),
  alternatePhone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  gstNumber: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  createdBy: z.string().uuid().optional().nullable()
});

const UpdateSchema = SupplierSchema.partial();

// Helper: Convert DB snake_case → JS camelCase
function mapSupplier(row: any) {
  return {
    id: row.id,
    supplierName: row.supplier_name ?? row.name,
    companyName: row.company_name,
    phone: row.phone,
    alternatePhone: row.alternate_phone,
    address: row.address,
    gstNumber: row.gst_number,
    category: row.category,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// ==========================
// GET ALL SUPPLIERS
// ==========================
router.get("/suppliers", async (req, res) => {
  try {
    const rows = await query(
      `SELECT *
       FROM suppliers
       ORDER BY created_at DESC`
    );
    res.json(rows.map(mapSupplier));
  } catch (err) {
    console.error("GET suppliers error:", err);
    res.status(500).json({ error: "Failed to get suppliers" });
  }
});

// ==========================
// GET SINGLE SUPPLIER
// ==========================
router.get("/suppliers/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const rows = await query(`SELECT * FROM suppliers WHERE id = $1`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(mapSupplier(rows[0]));
  } catch (err) {
    res.status(500).json({ error: "Failed to get supplier" });
  }
});

// ==========================
// CREATE
// ==========================
router.post("/suppliers", async (req, res) => {
  try {
    const data = SupplierSchema.parse(req.body);
    // Detect column set dynamically to handle existing schema variants
    const cols = await query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'suppliers' AND table_schema = 'public'`
    );
    const hasSupplierName = cols.some((c: any) => c.column_name === 'supplier_name');
    const hasName = cols.some((c: any) => c.column_name === 'name');
    const nameCol = hasSupplierName ? 'supplier_name' : (hasName ? 'name' : 'supplier_name');

    const result = await query(
      `INSERT INTO suppliers (${nameCol}, company_name, phone, alternate_phone, address, gst_number, category, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        data.supplierName,
        data.companyName ?? null,
        data.phone,
        data.alternatePhone ?? null,
        data.address ?? null,
        data.gstNumber ?? null,
        data.category ?? null,
        data.notes ?? null,
        data.createdBy ?? null
      ]
    );

    res.status(201).json(mapSupplier(result[0]));
  } catch (err: any) {
    console.error("POST suppliers error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================
// UPDATE
// ==========================
router.put("/suppliers/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const data = UpdateSchema.parse(req.body);

    const sets: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (data.supplierName !== undefined) {
      const cols = await query(
        `SELECT column_name FROM information_schema.columns WHERE table_name = 'suppliers' AND table_schema = 'public'`
      );
      const hasSupplierName = cols.some((c: any) => c.column_name === 'supplier_name');
      const hasName = cols.some((c: any) => c.column_name === 'name');
      const nameCol = hasSupplierName ? 'supplier_name' : (hasName ? 'name' : 'supplier_name');
      sets.push(`${nameCol} = $${i++}`);
      values.push(data.supplierName);
    }
    if (data.companyName !== undefined) { sets.push(`company_name = $${i++}`); values.push(data.companyName ?? null); }
    if (data.phone !== undefined) { sets.push(`phone = $${i++}`); values.push(data.phone); }
    if (data.alternatePhone !== undefined) { sets.push(`alternate_phone = $${i++}`); values.push(data.alternatePhone ?? null); }
    if (data.address !== undefined) { sets.push(`address = $${i++}`); values.push(data.address ?? null); }
    if (data.gstNumber !== undefined) { sets.push(`gst_number = $${i++}`); values.push(data.gstNumber ?? null); }
    if (data.category !== undefined) { sets.push(`category = $${i++}`); values.push(data.category ?? null); }
    if (data.notes !== undefined) { sets.push(`notes = $${i++}`); values.push(data.notes ?? null); }

    values.push(id);

    const result = await query(
      `UPDATE suppliers SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`,
      values
    );

    if (result.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(mapSupplier(result[0]));

  } catch (err: any) {
    console.error("PUT suppliers error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================
// DELETE (HARD)
// ==========================
router.delete("/suppliers/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const result = await query(
      `DELETE FROM suppliers WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.length === 0) return res.status(404).json({ error: "Not found" });

    res.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE suppliers error:", err);
    res.status(400).json({ error: err.message });
  }
});

export default router;
