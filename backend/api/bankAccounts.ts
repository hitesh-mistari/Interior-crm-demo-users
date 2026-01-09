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
// DELETE (HARD)
// ==========================
router.delete("/bank-accounts/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const result = await query(
      `DELETE FROM bank_accounts WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.length === 0) return res.status(404).json({ error: "Not found" });

    res.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE bank-accounts error:", err);
    res.status(400).json({ error: err.message });
  }
});

export default router;