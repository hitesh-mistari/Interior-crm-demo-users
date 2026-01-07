import express from "express";
import { z } from "zod";
import { query, withTransaction } from "../db";

const router = express.Router();

// ==========================
// MAPPER
// ==========================
function mapSupplierPayment(row: any) {
  return {
    id: row.id,
    supplierId: row.supplier_id,
    expenseId: row.expense_id,
    amount: Number(row.amount),
    paymentMode: row.payment_mode,
    paymentDate: row.payment_date,
    notes: row.notes,
    createdAt: row.created_at,
    createdBy: row.created_by,
    deleted: row.deleted,
  };
}

// Zod validation schema
const SupplierPaymentSchema = z.object({
  supplierId: z.string().uuid(),
  expenseId: z.string().uuid().optional().nullable(),
  amount: z.preprocess((v) => Number(v), z.number()),
  paymentMode: z.enum(["Cash", "Cheque", "UPI", "Banking", "Other"]), // Matching frontend
  paymentDate: z.string(),
  notes: z.string().optional().nullable(),
});

const UpdateSchema = SupplierPaymentSchema.partial();

// ==========================
// GET ALL SUPPLIER PAYMENTS
// ==========================
router.get("/supplier-payments", async (req, res) => {
  try {
    const rows = await query(
      `SELECT *
       FROM supplier_payments
       WHERE deleted = FALSE
       ORDER BY created_at DESC`
    );
    res.json(rows.map(mapSupplierPayment));
  } catch (err) {
    console.error("GET supplier-payments error:", err);
    res.status(500).json({ error: "Failed to get supplier payments" });
  }
});

// ==========================
// GET SINGLE SUPPLIER PAYMENT
// ==========================
router.get("/supplier-payments/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const rows = await query(`SELECT * FROM supplier_payments WHERE id = $1`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(mapSupplierPayment(rows[0]));
  } catch (err) {
    res.status(500).json({ error: "Failed to get supplier payment" });
  }
});

// ==========================
// CREATE
// ==========================
router.post("/supplier-payments", async (req, res) => {
  try {
    const data = SupplierPaymentSchema.parse(req.body);

    const result = await withTransaction(async (client: any) => {
      // Insert the payment
      const paymentResult = await client.query(
        `INSERT INTO supplier_payments (supplier_id, expense_id, amount, payment_mode, payment_date, notes, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING *`,
        [
          data.supplierId,
          data.expenseId || null,
          data.amount,
          data.paymentMode,
          data.paymentDate,
          data.notes || null,
          req.body.createdBy || null
        ]
      );

      const payment = paymentResult.rows[0];

      // If this payment is linked to an expense, update the expense's payment_status
      if (data.expenseId) {
        // Get the expense details
        const expenseResult = await client.query(
          `SELECT id, amount, supplier_id FROM expenses WHERE id = $1 AND deleted = FALSE`,
          [data.expenseId]
        );

        if (expenseResult.rowCount > 0) {
          const expense = expenseResult.rows[0];
          const expenseAmount = Number(expense.amount);

          // Calculate total paid for this expense
          const paymentsResult = await client.query(
            `SELECT COALESCE(SUM(amount), 0) as total_paid 
             FROM supplier_payments 
             WHERE expense_id = $1 AND deleted = FALSE`,
            [data.expenseId]
          );

          const totalPaid = Number(paymentsResult.rows[0].total_paid);

          // Update payment status based on total paid
          // Database constraint only allows 'Paid' or 'Unpaid'
          let newStatus = 'Unpaid';
          if (totalPaid >= expenseAmount) {
            newStatus = 'Paid';
          }

          // If expense doesn't have a supplier linked yet, link it to the payment's supplier
          if (!expense.supplier_id && data.supplierId) {
            await client.query(
              `UPDATE expenses SET payment_status = $1, supplier_id = $2, updated_at = NOW() WHERE id = $3`,
              [newStatus, data.supplierId, data.expenseId]
            );
          } else {
            await client.query(
              `UPDATE expenses SET payment_status = $1, updated_at = NOW() WHERE id = $2`,
              [newStatus, data.expenseId]
            );
          }
        }
      }

      return payment;
    });

    res.status(201).json(mapSupplierPayment(result));
  } catch (err: any) {
    console.error("POST supplier-payments error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================
// UPDATE
// ==========================
router.put("/supplier-payments/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const data = UpdateSchema.parse(req.body);

    const sets: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (data.supplierId !== undefined) { sets.push(`supplier_id = $${i++}`); values.push(data.supplierId); }
    if (data.expenseId !== undefined) { sets.push(`expense_id = $${i++}`); values.push(data.expenseId || null); }
    if (data.amount !== undefined) { sets.push(`amount = $${i++}`); values.push(data.amount); }
    if (data.paymentMode !== undefined) { sets.push(`payment_mode = $${i++}`); values.push(data.paymentMode); }
    if (data.paymentDate !== undefined) { sets.push(`payment_date = $${i++}`); values.push(data.paymentDate); }
    if (data.notes !== undefined) { sets.push(`notes = $${i++}`); values.push(data.notes || null); }

    values.push(id);

    const result = await query(
      `UPDATE supplier_payments SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`,
      values
    );

    if (result.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(mapSupplierPayment(result[0]));

  } catch (err: any) {
    console.error("PUT supplier-payments error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================
// SOFT DELETE → trash
// ==========================
router.delete("/supplier-payments/:id", async (req, res) => {
  const id = req.params.id;
  const actorUserId = req.body.actorUserId ?? null;
  const reason = req.body.reason ?? null;

  try {
    const result = await withTransaction(async (client: any) => {
      // get snapshot
      const rows = await client.query(
        `SELECT * FROM supplier_payments WHERE id = $1 AND deleted = FALSE`,
        [id]
      );
      if (rows.rowCount === 0) throw new Error("Not found");

      const snap = rows.rows[0];
      const expenseId = snap.expense_id;

      // mark deleted
      await client.query(
        `UPDATE supplier_payments
         SET deleted = TRUE, deleted_at = NOW(), deleted_by = $1
         WHERE id = $2`,
        [actorUserId, id]
      );

      // insert trash snapshot
      await client.query(
        `INSERT INTO supplier_payment_trash (original_id, snapshot_json, deleted_at, deleted_by, reason, retention_until)
         VALUES ($1, $2, NOW(), $3, $4, NOW() + ($5 || ' days')::interval)`,
        [id, JSON.stringify(snap), actorUserId, reason, process.env.TRASH_RETENTION_DAYS || "30"]
      );

      // trash log
      await client.query(
        `INSERT INTO trash_logs (item_type, item_id, action, actor_user_id, reason)
         VALUES ('supplier_payment', $1, 'move', $2, $3)`,
        [id, actorUserId, reason]
      );

      // Recalculate expense payment status if this payment was linked to an expense
      if (expenseId) {
        const expenseResult = await client.query(
          `SELECT id, amount, supplier_id FROM expenses WHERE id = $1 AND deleted = FALSE`,
          [expenseId]
        );

        if (expenseResult.rowCount > 0) {
          const expense = expenseResult.rows[0];
          const expenseAmount = Number(expense.amount);

          // Calculate total paid for this expense (excluding the deleted payment)
          const paymentsResult = await client.query(
            `SELECT COALESCE(SUM(amount), 0) as total_paid 
             FROM supplier_payments 
             WHERE expense_id = $1 AND deleted = FALSE`,
            [expenseId]
          );

          const totalPaid = Number(paymentsResult.rows[0].total_paid);

          // Update payment status based on remaining payments
          // Database constraint only allows 'Paid' or 'Unpaid'
          let newStatus = 'Unpaid';
          if (totalPaid >= expenseAmount) {
            newStatus = 'Paid';
          }

          // Note: We don't remove the supplier_id even if all payments are deleted
          // The supplier link should remain as it represents who the expense was for
          await client.query(
            `UPDATE expenses SET payment_status = $1, updated_at = NOW() WHERE id = $2`,
            [newStatus, expenseId]
          );
        }
      }

      return { ok: true };
    });

    res.json(result);

  } catch (err: any) {
    console.error("DELETE supplier-payments error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================
// RESTORE
// ==========================
router.post("/supplier-payments/:id/restore", async (req, res) => {
  const id = req.params.id;
  const actorUserId = req.body.actorUserId ?? null;

  try {
    const result = await withTransaction(async (client: any) => {
      // Get the payment details before restoring
      const paymentRows = await client.query(
        `SELECT * FROM supplier_payments WHERE id = $1`,
        [id]
      );

      if (paymentRows.rowCount === 0) throw new Error("Payment not found");
      const payment = paymentRows.rows[0];
      const expenseId = payment.expense_id;

      await client.query(
        `UPDATE supplier_payments
         SET deleted = FALSE, deleted_at = NULL, deleted_by = NULL
         WHERE id = $1`,
        [id]
      );

      await client.query(`DELETE FROM supplier_payment_trash WHERE original_id = $1`, [id]);

      await client.query(
        `INSERT INTO trash_logs (item_type, item_id, action, actor_user_id)
         VALUES ('supplier_payment', $1, 'restore', $2)`,
        [id, actorUserId]
      );

      // Recalculate expense payment status if this payment is linked to an expense
      if (expenseId) {
        const expenseResult = await client.query(
          `SELECT id, amount, supplier_id FROM expenses WHERE id = $1 AND deleted = FALSE`,
          [expenseId]
        );

        if (expenseResult.rowCount > 0) {
          const expense = expenseResult.rows[0];
          const expenseAmount = Number(expense.amount);

          // Calculate total paid for this expense (including the restored payment)
          const paymentsResult = await client.query(
            `SELECT COALESCE(SUM(amount), 0) as total_paid 
             FROM supplier_payments 
             WHERE expense_id = $1 AND deleted = FALSE`,
            [expenseId]
          );

          const totalPaid = Number(paymentsResult.rows[0].total_paid);

          // Update payment status based on total paid
          // Database constraint only allows 'Paid' or 'Unpaid'
          let newStatus = 'Unpaid';
          if (totalPaid >= expenseAmount) {
            newStatus = 'Paid';
          }

          // If expense doesn't have a supplier linked yet, link it to the payment's supplier
          const paymentSupplierId = payment.supplier_id;
          if (!expense.supplier_id && paymentSupplierId) {
            await client.query(
              `UPDATE expenses SET payment_status = $1, supplier_id = $2, updated_at = NOW() WHERE id = $3`,
              [newStatus, paymentSupplierId, expenseId]
            );
          } else {
            await client.query(
              `UPDATE expenses SET payment_status = $1, updated_at = NOW() WHERE id = $2`,
              [newStatus, expenseId]
            );
          }
        }
      }

      return { ok: true };
    });

    res.json(result);

  } catch (err: any) {
    console.error("RESTORE supplier-payments error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================
// TRASH LIST
// ==========================
router.get("/trash/supplier-payments", async (_req, res) => {
  try {
    const rows = await query(
      `SELECT * FROM supplier_payment_trash ORDER BY deleted_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("GET trash/supplier-payments error:", err);
    res.status(500).json({ error: "Failed to get trash list" });
  }
});

// ==========================
// PERMANENT DELETE (PURGE)
// ==========================
router.delete("/trash/supplier-payments/:id", async (req, res) => {
  const id = req.params.id;
  const actorUserId = req.body.actorUserId ?? null;

  try {
    const result = await withTransaction(async (client: any) => {
      await client.query(`DELETE FROM supplier_payment_trash WHERE original_id = $1`, [id]);
      await client.query(`DELETE FROM supplier_payments WHERE id = $1`, [id]);

      await client.query(
        `INSERT INTO trash_logs (item_type, item_id, action, actor_user_id)
         VALUES ('supplier_payment', $1, 'purge', $2)`,
        [id, actorUserId]
      );

      return { ok: true };
    });

    res.json(result);

  } catch (err: any) {
    console.error("PURGE supplier-payments error:", err);
    res.status(400).json({ error: err.message });
  }
});

export default router;