import express from "express";
import { z } from "zod";
import { query, withTransaction } from "../db";

const router = express.Router();

// Zod validation schema
const PaymentSchema = z.object({
  projectId: z.string().uuid(),
  quotationId: z.string().uuid().optional().nullable(),
  amount: z.number(),
  paymentDate: z.string().optional().nullable(),
  paymentType: z.string().optional().nullable(),
  paymentMode: z.string().optional().nullable(),
  referenceNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  createdBy: z.string().uuid().optional().nullable()
});

const UpdateSchema = PaymentSchema.partial();

// Helper: Convert DB snake_case → JS camelCase
function mapPayment(row: any) {
  return {
    id: row.id,
    projectId: row.project_id,
    amount: Number(row.amount), // Ensure number
    paymentDate: row.payment_date,
    paymentType: row.payment_type,
    paymentMode: row.payment_mode,
    referenceNumber: row.reference_number,
    notes: row.notes,
    addedBy: row.added_by,
    editCount: row.edit_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// ==========================
// GET ALL PAYMENTS
// ==========================
router.get("/payments", async (req, res) => {
  try {
    const rows = await query(
      `SELECT *
       FROM payments
       ORDER BY created_at DESC`
    );
    res.json(rows.map(mapPayment));
  } catch (err) {
    console.error("GET payments error:", err);
    res.status(500).json({ error: "Failed to get payments" });
  }
});

// ==========================
// GET SINGLE PAYMENT (optional)
// ==========================
router.get("/payments/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const rows = await query(`SELECT * FROM payments WHERE id = $1`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(mapPayment(rows[0]));
  } catch (err) {
    res.status(500).json({ error: "Failed to get payment" });
  }
});

// ==========================
// CREATE
// ==========================
router.post("/payments", async (req, res) => {
  try {
    const data = PaymentSchema.parse(req.body);

    const result = await query(
      `INSERT INTO payments (project_id, amount, payment_type, payment_mode, payment_date, reference_number, notes, added_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        data.projectId,
        data.amount,
        data.paymentType ?? 'Installment', // Default to Installment if missing, though frontend should send it
        data.paymentMode ?? null,
        data.paymentDate ?? null,
        data.referenceNumber ?? null,
        data.notes ?? null,
        data.createdBy || (req as any).user?.id || null
      ]
    );

    res.status(201).json(mapPayment(result[0]));
  } catch (err: any) {
    console.error("POST payments error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================
// UPDATE
// ==========================
router.put("/payments/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const data = UpdateSchema.parse(req.body);

    const sets: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (data.projectId !== undefined) { sets.push(`project_id = $${i++}`); values.push(data.projectId); }
    // quotation_id not in DB
    if (data.amount !== undefined) { sets.push(`amount = $${i++}`); values.push(data.amount); }
    if (data.paymentType !== undefined) { sets.push(`payment_type = $${i++}`); values.push(data.paymentType ?? 'Installment'); }
    if (data.paymentMode !== undefined) { sets.push(`payment_mode = $${i++}`); values.push(data.paymentMode ?? null); }
    if (data.paymentDate !== undefined) { sets.push(`payment_date = $${i++}`); values.push(data.paymentDate ?? null); }
    if (data.referenceNumber !== undefined) { sets.push(`reference_number = $${i++}`); values.push(data.referenceNumber ?? null); }
    if (data.notes !== undefined) { sets.push(`notes = $${i++}`); values.push(data.notes ?? null); }

    sets.push(`updated_at = NOW()`);

    values.push(id);

    const result = await query(
      `UPDATE payments SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`,
      values
    );

    if (result.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(mapPayment(result[0]));

  } catch (err: any) {
    console.error("PUT payments error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================
// DELETE (HARD)
// ==========================
router.delete("/payments/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const result = await query(
      `DELETE FROM payments WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.length === 0) return res.status(404).json({ error: "Not found" });

    res.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE payments error:", err);
    res.status(400).json({ error: err.message });
  }
});

export default router;
