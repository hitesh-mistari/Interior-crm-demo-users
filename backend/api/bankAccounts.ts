import express from "express";
import { z } from "zod";
import { query, withTransaction } from "../db";

const router = express.Router();

// Zod validation schema
const BankAccountSchema = z.object({
  accountHolderName: z.string(),
  accountNumber: z.string(),
  bankName: z.string(),
  branchName: z.string().optional().nullable(),
  branchAddress: z.string().optional().nullable(),
  accountType: z.enum(["Current", "Savings"]).optional().nullable(),
  ifscCode: z.string().optional().nullable(),
  upiIdOrPhone: z.string().optional().nullable(),
  paymentInstructions: z.string().optional().nullable(),
  isDefault: z.boolean().optional().nullable(),
  isActive: z.boolean().optional().nullable(),
  description: z.string().optional().nullable(),
  createdBy: z.string().uuid().optional().nullable()
});

const UpdateSchema = BankAccountSchema.partial();

// ==========================
// GET ALL BANK ACCOUNTS
// ==========================
router.get("/bank-accounts", async (req, res) => {
  try {
    const rows = await query(
      `SELECT *
       FROM bank_accounts
       WHERE deleted = FALSE
       ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("GET bank-accounts error:", err);
    res.status(500).json({ error: "Failed to get bank accounts" });
  }
});

// ==========================
// GET SINGLE BANK ACCOUNT (optional)
// ==========================
router.get("/bank-accounts/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const rows = await query(`SELECT * FROM bank_accounts WHERE id = $1`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to get bank account" });
  }
});

// ==========================
// CREATE
// ==========================
router.post("/bank-accounts", async (req, res) => {
  try {
    const data = BankAccountSchema.parse(req.body);

    const result = await withTransaction(async (client: any) => {
      // If setting as default, unset others first
      if (data.isDefault) {
        await client.query(`UPDATE bank_accounts SET is_default = FALSE`);
      }

      const res = await client.query(
        `INSERT INTO bank_accounts (
          account_holder_name, account_number, bank_name, branch_name, branch_address, 
          account_type, ifsc_code, upi_id_or_phone, payment_instructions, is_default, 
          created_by
        )
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING *`,
        [
          data.accountHolderName,
          data.accountNumber,
          data.bankName,
          data.branchName || '',
          data.branchAddress || '',
          data.accountType || 'Current',
          data.ifscCode || '',
          data.upiIdOrPhone ?? null,
          data.paymentInstructions ?? null,
          data.isDefault ?? false,
          data.createdBy ?? null
        ]
      );
      return res.rows[0];
    });

    res.status(201).json(result);
  } catch (err: any) {
    console.error("POST bank-accounts error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================
// UPDATE
// ==========================
router.put("/bank-accounts/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const data = UpdateSchema.parse(req.body);

    const result = await withTransaction(async (client: any) => {
      // If setting as default, unset others first
      if (data.isDefault === true) {
        await client.query(`UPDATE bank_accounts SET is_default = FALSE WHERE id <> $1`, [id]);
      }

      const sets: string[] = [];
      const values: any[] = [];
      let i = 1;

      if (data.accountHolderName !== undefined) { sets.push(`account_holder_name = $${i++}`); values.push(data.accountHolderName); }
      if (data.accountNumber !== undefined) { sets.push(`account_number = $${i++}`); values.push(data.accountNumber); }
      if (data.bankName !== undefined) { sets.push(`bank_name = $${i++}`); values.push(data.bankName); }
      if (data.branchName !== undefined) { sets.push(`branch_name = $${i++}`); values.push(data.branchName || ''); }
      if (data.branchAddress !== undefined) { sets.push(`branch_address = $${i++}`); values.push(data.branchAddress || ''); }
      if (data.accountType !== undefined) { sets.push(`account_type = $${i++}`); values.push(data.accountType || 'Current'); }
      if (data.ifscCode !== undefined) { sets.push(`ifsc_code = $${i++}`); values.push(data.ifscCode || ''); }
      if (data.upiIdOrPhone !== undefined) { sets.push(`upi_id_or_phone = $${i++}`); values.push(data.upiIdOrPhone ?? null); }
      if (data.paymentInstructions !== undefined) { sets.push(`payment_instructions = $${i++}`); values.push(data.paymentInstructions ?? null); }
      if (data.isDefault !== undefined) { sets.push(`is_default = $${i++}`); values.push(data.isDefault); }
      if (data.description !== undefined) { sets.push(`description = $${i++}`); values.push(data.description ?? null); }

      sets.push(`updated_at = NOW()`);

      values.push(id);

      const res = await client.query(
        `UPDATE bank_accounts SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`,
        values
      );

      if (res.rows.length === 0) throw new Error("Not found");
      return res.rows[0];
    });

    res.json(result);

  } catch (err: any) {
    console.error("PUT bank-accounts error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================
// SOFT DELETE → trash
// ==========================
router.delete("/bank-accounts/:id", async (req, res) => {
  const id = req.params.id;
  const actorUserId = req.body.actorUserId ?? null;
  const reason = req.body.reason ?? null;

  try {
    const result = await withTransaction(async (client: any) => {
      // get snapshot
      const rows = await client.query(
        `SELECT * FROM bank_accounts WHERE id = $1 AND deleted = FALSE`,
        [id]
      );
      if (rows.rowCount === 0) throw new Error("Not found");

      const snap = rows.rows[0];

      // mark deleted
      await client.query(
        `UPDATE bank_accounts
         SET deleted = TRUE, deleted_at = NOW(), deleted_by = $1
         WHERE id = $2`,
        [actorUserId, id]
      );

      // insert trash snapshot
      await client.query(
        `INSERT INTO bank_account_trash (original_id, snapshot_json, deleted_at, deleted_by, reason, retention_until)
         VALUES ($1, $2, NOW(), $3, $4, NOW() + ($5 || ' days')::interval)`,
        [id, JSON.stringify(snap), actorUserId, reason, process.env.TRASH_RETENTION_DAYS || "30"]
      );

      // trash log
      await client.query(
        `INSERT INTO trash_logs (item_type, item_id, action, actor_user_id, reason)
         VALUES ('bank_account', $1, 'move', $2, $3)`,
        [id, actorUserId, reason]
      );

      return { ok: true };
    });

    res.json(result);

  } catch (err: any) {
    console.error("DELETE bank-accounts error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================
// RESTORE
// ==========================
router.post("/bank-accounts/:id/restore", async (req, res) => {
  const id = req.params.id;
  const actorUserId = req.body.actorUserId ?? null;

  try {
    const result = await withTransaction(async (client: any) => {
      await client.query(
        `UPDATE bank_accounts
         SET deleted = FALSE, deleted_at = NULL, deleted_by = NULL
         WHERE id = $1`,
        [id]
      );

      await client.query(`DELETE FROM bank_account_trash WHERE original_id = $1`, [id]);

      await client.query(
        `INSERT INTO trash_logs (item_type, item_id, action, actor_user_id)
         VALUES ('bank_account', $1, 'restore', $2)`,
        [id, actorUserId]
      );

      return { ok: true };
    });

    res.json(result);

  } catch (err: any) {
    console.error("RESTORE bank-accounts error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================
// TRASH LIST
// ==========================
router.get("/trash/bank-accounts", async (_req, res) => {
  try {
    const rows = await query(
      `SELECT * FROM bank_account_trash ORDER BY deleted_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("GET trash/bank-accounts error:", err);
    res.status(500).json({ error: "Failed to get trash list" });
  }
});

// ==========================
// PERMANENT DELETE (PURGE)
// ==========================
router.delete("/trash/bank-accounts/:id", async (req, res) => {
  const id = req.params.id;
  const actorUserId = req.body.actorUserId ?? null;

  try {
    const result = await withTransaction(async (client: any) => {
      await client.query(`DELETE FROM bank_account_trash WHERE original_id = $1`, [id]);
      await client.query(`DELETE FROM bank_accounts WHERE id = $1`, [id]);

      await client.query(
        `INSERT INTO trash_logs (item_type, item_id, action, actor_user_id)
         VALUES ('bank_account', $1, 'purge', $2)`,
        [id, actorUserId]
      );

      return { ok: true };
    });

    res.json(result);

  } catch (err: any) {
    console.error("PURGE bank-accounts error:", err);
    res.status(400).json({ error: err.message });
  }
});

export default router;