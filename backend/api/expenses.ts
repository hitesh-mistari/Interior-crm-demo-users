import express from "express";
import { z } from "zod";
import { query, withTransaction } from "../db";
import upload from "../utils/upload";

const router = express.Router();

const ExpenseItemSchema = z.object({
  description: z.string(),
  amount: z.number(),
});

const ExpenseSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string(),
  amount: z.number(),
  expenseDate: z.string().optional().nullable(),
  paymentMode: z.string().optional().nullable(),
  paymentStatus: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  receiptImages: z.any().optional(),
  items: z.array(ExpenseItemSchema).optional().nullable(),
  supplierId: z.string().uuid().optional().nullable(),
  tempSupplierName: z.string().optional().nullable(),
  teamMemberId: z.string().uuid().optional().nullable(),
  createdBy: z.string().uuid().optional().nullable(),
});

const UpdateSchema = ExpenseSchema.partial();

function normalizeReceiptImages(input: any): string[] {
  let imgs: any[] = [];
  if (Array.isArray(input)) imgs = input;
  else if (typeof input === "string") imgs = [input];
  else if (input && typeof input === "object") imgs = Object.values(input);
  const out: string[] = [];
  for (const v of imgs) {
    if (v == null) continue;
    let s = String(v).trim();
    if (!s) continue;
    if (!s.startsWith("http://") && !s.startsWith("https://")) {
      while (s.includes("//")) s = s.replace("//", "/");
    }
    out.push(s);
  }
  return out;
}

function mapExpenseRow(row: any) {
  const imgs = normalizeReceiptImages(row?.receipt_images);
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    amount: Number(row.amount),
    expenseDate: row.expense_date,
    addedBy: row.added_by,
    notes: row.notes,
    paymentMode: row.payment_mode,
    paymentStatus: row.payment_status,
    receiptImages: imgs,
    supplierId: row.supplier_id,
    tempSupplierName: row.temp_supplier_name,
    teamMemberId: row.team_member_id,
    editCount: row.edit_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deleted: row.deleted,
    deletedAt: row.deleted_at,
    deletedBy: row.deleted_by,
  };
}

router.get("/expenses", async (_req, res) => {
  try {
    const rows = await query(
      `SELECT * FROM expenses WHERE deleted = FALSE ORDER BY created_at DESC`
    );
    res.json(rows.map(mapExpenseRow));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch" });
  }
});

router.get("/expenses/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const rows = await query(`SELECT * FROM expenses WHERE id = $1`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(mapExpenseRow(rows[0]));
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch" });
  }
});

router.post("/expenses/upload", upload.any(), async (req, res) => {
  const files = (req as any).files || [];
  const paths = files.map((f: any) => `/uploads/expenses/${f.filename}`);
  const urls = paths;
  res.json({ urls, paths });
});

router.post("/expenses", async (req, res) => {
  try {
    const data = ExpenseSchema.parse(req.body);
    const imgs = normalizeReceiptImages(data.receiptImages);
    const created = await withTransaction(async (client: any) => {
      const insert = await client.query(
        `INSERT INTO expenses (project_id, title, amount, expense_date, payment_mode, payment_status, notes, receipt_images, supplier_id, temp_supplier_name, team_member_id, added_by, created_at, updated_at, deleted)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12,NOW(),NULL,FALSE)
         RETURNING *`,
        [
          data.projectId,
          data.title,
          data.amount,
          data.expenseDate ?? null,
          data.paymentMode ?? null,
          data.paymentStatus ?? null,
          data.notes ?? null,
          JSON.stringify(imgs),
          data.supplierId ?? null,
          data.tempSupplierName ?? null,
          data.teamMemberId ?? null,
          data.createdBy ?? null,
        ]
      );
      const row = insert.rows[0];
      const id = row.id;
      const items = Array.isArray(data.items) ? data.items : [];
      if (items.length) {
        for (const it of items) {
          await client.query(
            `INSERT INTO expense_items (expense_id, description, amount) VALUES ($1,$2,$3)`,
            [id, it.description, it.amount]
          );
        }
      }
      return row;
    });
    const final = mapExpenseRow(created);
    res.status(201).json(final);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/expenses/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const data = UpdateSchema.parse(req.body);
    const updated = await withTransaction(async (client: any) => {
      const sets: string[] = [];
      const vals: any[] = [];
      let i = 1;
      const push = (expr: string, val: any, castJsonb = false) => {
        sets.push(castJsonb ? `${expr} = $${i}::jsonb` : `${expr} = $${i}`);
        vals.push(val);
        i++;
      };
      if (data.projectId !== undefined) push("project_id", data.projectId);
      if (data.title !== undefined) push("title", data.title);
      if (data.amount !== undefined) push("amount", data.amount);
      if (data.expenseDate !== undefined) push("expense_date", data.expenseDate ?? null);
      if (data.paymentMode !== undefined) push("payment_mode", data.paymentMode ?? null);
      if (data.paymentStatus !== undefined) push("payment_status", data.paymentStatus ?? null);
      if (data.notes !== undefined) push("notes", data.notes ?? null);
      if (data.receiptImages !== undefined) {
        const imgs = normalizeReceiptImages(data.receiptImages);
        push("receipt_images", JSON.stringify(imgs), true);
      }
      if (data.supplierId !== undefined) push("supplier_id", data.supplierId ?? null);
      if (data.tempSupplierName !== undefined) push("temp_supplier_name", data.tempSupplierName ?? null);
      if (data.teamMemberId !== undefined) push("team_member_id", data.teamMemberId ?? null);
      sets.push(`updated_at = NOW()`);
      vals.push(id);
      const result = await client.query(
        `UPDATE expenses SET ${sets.join(", ")} WHERE id = $${vals.length} RETURNING *`,
        vals
      );
      const expense = result.rows[0];
      if (data.items !== undefined) {
        await client.query(`DELETE FROM expense_items WHERE expense_id = $1`, [id]);
        const items = Array.isArray(data.items) ? data.items : [];
        for (const it of items) {
          await client.query(
            `INSERT INTO expense_items (expense_id, description, amount) VALUES ($1,$2,$3)`,
            [id, it.description, it.amount]
          );
        }
      }
      return expense;
    });
    const final = mapExpenseRow(updated);
    res.json(final);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/expenses/:id", async (req, res) => {
  const id = req.params.id;
  try {
    // Simple direct delete - no trash functionality
    const result = await query(`DELETE FROM expenses WHERE id = $1 RETURNING *`, [id]);

    if (result.length === 0) {
      return res.status(404).json({ error: "Expense not found" });
    }

    res.json({ ok: true, message: "Expense deleted successfully" });
  } catch (err: any) {
    console.error("Delete expense error:", err);
    res.status(400).json({ error: err.message });
  }
});

router.post("/expenses/:id/restore", async (req, res) => {
  const id = req.params.id;
  const actorUserId = req.body?.actorUserId ?? null;
  try {
    const result = await withTransaction(async (client: any) => {
      await client.query(
        `UPDATE expenses SET deleted = FALSE, deleted_at = NULL, deleted_by = NULL, updated_at = NOW() WHERE id = $1`,
        [id]
      );
      await client.query(`DELETE FROM expense_trash WHERE original_id = $1`, [id]);
      await client.query(
        `INSERT INTO trash_logs (item_type, item_id, action, actor_user_id) VALUES ('expense', $1, 'restore', $2)`,
        [id, actorUserId]
      );
      return { ok: true };
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/trash/expenses", async (_req, res) => {
  try {
    const rows = await query(`SELECT * FROM expense_trash ORDER BY deleted_at DESC`);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to list trash" });
  }
});

router.delete("/trash/expenses/:id", async (req, res) => {
  const id = req.params.id;
  const actorUserId = req.body?.actorUserId ?? null;
  try {
    const result = await withTransaction(async (client: any) => {
      await client.query(`DELETE FROM expense_trash WHERE original_id = $1`, [id]);
      await client.query(`DELETE FROM expenses WHERE id = $1`, [id]);
      await client.query(
        `INSERT INTO trash_logs (item_type, item_id, action, actor_user_id) VALUES ('expense', $1, 'purge', $2)`,
        [id, actorUserId]
      );
      return { ok: true };
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
