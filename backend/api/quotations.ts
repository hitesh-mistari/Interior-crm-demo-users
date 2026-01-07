import express from "express";
import { z } from "zod";
import { query, withTransaction } from "../db";

const router = express.Router();

// =====================================
// ZOD SCHEMAS
// =====================================

const QuotationSchema = z.object({
  projectName: z.string(),
  quotationNumber: z.string().optional().nullable(),
  clientName: z.string(),
  clientContact: z.string().optional().nullable(),
  clientPhone: z.string().optional().nullable(),
  quotationDate: z.string().optional().nullable(),
  items: z.array(z.any()),
  additionalWork: z.array(z.any()).optional().nullable(),
  subtotal: z.number(),
  discountPercent: z.number().optional().default(0),
  discountAmount: z.number().optional().default(0),
  taxPercent: z.number(),
  taxAmount: z.number(),
  total: z.number(),
  status: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  includeTerms: z.boolean().optional().nullable(),
  includeBankDetails: z.boolean().optional().nullable(),
  bankAccountId: z.string().uuid().optional().nullable(),
  createdBy: z.string().uuid().optional().nullable()
});

const UpdateSchema = QuotationSchema.partial();

// DB allowed statuses
const ALLOWED_STATUSES = ["Draft", "Sent", "Approved", "Converted"];

// =====================================
// HELPERS
// =====================================

async function generateNextQuotationNumber(client: any) {
  const year = new Date().getFullYear();
  const prefix = `QT-${year}-`;

  const res = await client.query(
    `SELECT quotation_number FROM quotations 
     WHERE quotation_number LIKE $1 
     ORDER BY quotation_number DESC LIMIT 1`,
    [`${prefix}%`]
  );

  if (res.rowCount === 0) return `${prefix}0001`;

  const last = res.rows[0].quotation_number.split("-");
  const seq = parseInt(last[2], 10);

  const next = (seq + 1).toString().padStart(4, "0");
  return `${prefix}${next}`;
}

function mapItem(row: any) {
  return {
    id: row.id,
    quotationId: row.quotation_id,
    item: row.item,
    description: row.description,
    quantity: Number(row.quantity),
    unit: row.unit,
    rate: Number(row.rate),
    amount: Number(row.amount),
    isAdditional: row.is_additional
  };
}

function mapQuotation(row: any, items: any[] = []) {
  return {
    id: row.id,
    projectName: row.project_name,
    quotationNumber: row.quotation_number,
    clientName: row.client_name,
    clientContact: row.client_contact,
    clientPhone: row.client_phone,
    quotationDate: row.quotation_date,
    items: items.filter(i => !i.is_additional).map(mapItem),
    additionalWork: items.filter(i => i.is_additional).map(mapItem),
    subtotal: Number(row.subtotal),
    discountPercent: Number(row.discount_percent || 0),
    discountAmount: Number(row.discount_amount || 0),
    taxPercent: Number(row.tax_percent),
    taxAmount: Number(row.tax_amount),
    total: Number(row.total),
    status: row.status,
    notes: row.notes,
    includeTerms: row.include_terms,
    includeBankDetails: row.include_bank_details,
    bankAccountId: row.bank_account_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deleted: row.deleted,
    deletedAt: row.deleted_at,
    deletedBy: row.deleted_by
  };
}

// =====================================
// GET ALL QUOTATIONS
// =====================================

router.get("/quotations", async (_req, res) => {
  try {
    const quotations = await query(
      `SELECT * FROM quotations WHERE deleted = FALSE ORDER BY created_at DESC`
    );

    if (quotations.length === 0) return res.json([]);

    const ids = quotations.map((q: any) => q.id);
    const items = await query(
      `SELECT * FROM quotation_items WHERE quotation_id = ANY($1::uuid[])`,
      [ids]
    );

    const final = quotations.map((q: any) => {
      const qItems = items.filter((i: any) => i.quotation_id === q.id);
      return mapQuotation(q, qItems);
    });

    res.json(final);

  } catch (err) {
    console.error("GET quotations error:", err);
    res.status(500).json({ error: "Failed to get quotations" });
  }
});

// =====================================
// GET SINGLE QUOTATION
// =====================================

router.get("/quotations/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const rows = await query(`SELECT * FROM quotations WHERE id = $1`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });

    const items = await query(
      `SELECT * FROM quotation_items WHERE quotation_id = $1`,
      [id]
    );

    res.json(mapQuotation(rows[0], items));
  } catch (err) {
    res.status(500).json({ error: "Failed to get quotation" });
  }
});

// =====================================
// CREATE QUOTATION
// =====================================

router.post("/quotations", async (req, res) => {
  try {
    const data = QuotationSchema.parse(req.body);

    const result = await withTransaction(async (client: any) => {
      const quotationNumber = await generateNextQuotationNumber(client);

      const qRes = await client.query(
        `INSERT INTO quotations (
          project_name, quotation_number, client_name, client_contact, client_phone, 
          quotation_date, subtotal, discount_percent, discount_amount, tax_percent, tax_amount, total, 
          status, notes, include_terms, include_bank_details, bank_account_id, created_by
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
        RETURNING *`,
        [
          data.projectName,
          quotationNumber,
          data.clientName,
          data.clientContact ?? null,
          data.clientPhone ?? null,
          data.quotationDate ?? null,
          data.subtotal,
          data.discountPercent,
          data.discountAmount,
          data.taxPercent,
          data.taxAmount,
          data.total,
          data.status ?? "Draft",
          data.notes ?? null,
          data.includeTerms ?? false,
          data.includeBankDetails ?? false,
          data.bankAccountId ?? null,
          data.createdBy ?? null
        ]
      );

      const q = qRes.rows[0];

      // ITEMS
      for (const item of data.items) {
        await client.query(
          `INSERT INTO quotation_items 
           (quotation_id, item, description, quantity, unit, rate, amount, is_additional)
           VALUES ($1,$2,$3,$4,$5,$6,$7,FALSE)`,
          [q.id, item.item, item.description ?? '', item.quantity, item.unit, item.rate, item.amount]
        );
      }

      // ADDITIONAL WORK
      if (data.additionalWork) {
        for (const item of data.additionalWork) {
          await client.query(
            `INSERT INTO quotation_items
             (quotation_id, item, description, quantity, unit, rate, amount, is_additional)
             VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE)`,
            [q.id, item.item, item.description ?? '', item.quantity, item.unit, item.rate, item.amount]
          );
        }
      }

      const allItems = await client.query(
        `SELECT * FROM quotation_items WHERE quotation_id = $1`,
        [q.id]
      );

      return mapQuotation(q, allItems.rows);
    });

    res.status(201).json(result);

  } catch (err: any) {
    console.error("POST quotations error:", err);
    res.status(400).json({ error: err.message });
  }
});

// =====================================
// UPDATE QUOTATION
// =====================================

router.put("/quotations/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const data = UpdateSchema.parse(req.body);

    const result = await withTransaction(async (client: any) => {
      const sets: string[] = [];
      const values: any[] = [];
      let i = 1;

      const add = (field: string, value: any) => {
        sets.push(`${field} = $${i++}`);
        values.push(value);
      };

      if (data.projectName !== undefined) add("project_name", data.projectName);
      if (data.quotationNumber !== undefined) add("quotation_number", data.quotationNumber);
      if (data.clientName !== undefined) add("client_name", data.clientName);
      if (data.clientContact !== undefined) add("client_contact", data.clientContact ?? null);
      if (data.clientPhone !== undefined) add("client_phone", data.clientPhone ?? null);
      if (data.quotationDate !== undefined) add("quotation_date", data.quotationDate ?? null);
      if (data.subtotal !== undefined) add("subtotal", data.subtotal);
      if (data.discountPercent !== undefined) add("discount_percent", data.discountPercent);
      if (data.discountAmount !== undefined) add("discount_amount", data.discountAmount);
      if (data.taxPercent !== undefined) add("tax_percent", data.taxPercent);
      if (data.taxAmount !== undefined) add("tax_amount", data.taxAmount);
      if (data.total !== undefined) add("total", data.total);

      // FIX — validate status
      if (data.status !== undefined && data.status !== null) {
        if (!ALLOWED_STATUSES.includes(data.status)) {
          throw new Error("Invalid status");
        }
        add("status", data.status);
      }

      if (data.notes !== undefined) add("notes", data.notes ?? null);
      if (data.includeTerms !== undefined) add("include_terms", data.includeTerms ?? false);
      if (data.includeBankDetails !== undefined) add("include_bank_details", data.includeBankDetails ?? false);
      if (data.bankAccountId !== undefined) add("bank_account_id", data.bankAccountId ?? null);

      sets.push(`updated_at = NOW()`);
      values.push(id);

      const qRes = await client.query(
        `UPDATE quotations SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`,
        values
      );

      if (qRes.rowCount === 0) throw new Error("Not found");

      const quotation = qRes.rows[0];

      // ITEMS REPLACE
      if (data.items !== undefined || data.additionalWork !== undefined) {
        await client.query(`DELETE FROM quotation_items WHERE quotation_id = $1`, [id]);

        if (data.items) {
          for (const item of data.items) {
            await client.query(
              `INSERT INTO quotation_items 
               (quotation_id, item, description, quantity, unit, rate, amount, is_additional)
               VALUES ($1,$2,$3,$4,$5,$6,$7,FALSE)`,
              [id, item.item, item.description ?? '', item.quantity, item.unit, item.rate, item.amount]
            );
          }
        }

        if (data.additionalWork) {
          for (const item of data.additionalWork) {
            await client.query(
              `INSERT INTO quotation_items 
               (quotation_id, item, description, quantity, unit, rate, amount, is_additional)
               VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE)`,
              [id, item.item, item.description ?? '', item.quantity, item.unit, item.rate, item.amount]
            );
          }
        }
      }

      const items = await client.query(
        `SELECT * FROM quotation_items WHERE quotation_id = $1`,
        [id]
      );

      // UPDATE LINKED PROJECT AMOUNT
      // If there's a project linked to this quotation, update its project_amount
      // to match the quotation total. This ensures the project amount stays in sync,
      // especially when additional work is added to the quotation.
      if (data.total !== undefined) {
        const projectUpdateResult = await client.query(
          `UPDATE projects 
           SET project_amount = $1, updated_at = NOW() 
           WHERE quotation_id = $2 AND deleted = FALSE
           RETURNING *`,
          [data.total, id]
        );

        // Fallback: Smart Link by Name
        // If no project was updated (rowCount === 0), it implies the project might be unlinked.
        // We try to link it by matching project_name if valid.
        if (projectUpdateResult.rowCount === 0 && quotation.project_name) {
          await client.query(
            `UPDATE projects
             SET project_amount = $1, quotation_id = $2, updated_at = NOW()
             WHERE id = (
               SELECT id FROM projects 
               WHERE project_name = $3 
                 AND quotation_id IS NULL 
                 AND deleted = FALSE
               LIMIT 1
             )`,
            [data.total, id, quotation.project_name]
          );
        }

        // Broadcast the project change to trigger real-time UI updates
        if (projectUpdateResult.rowCount > 0) {
        }
      }

      return mapQuotation(quotation, items.rows);
    });

    res.json(result);

  } catch (err: any) {
    console.error("PUT quotations error:", err);
    res.status(400).json({ error: err.message });
  }
});

// =====================================
// DELETE (SOFT)
// =====================================

router.delete("/quotations/:id", async (req, res) => {
  const id = req.params.id;
  const actorUserId = req.body.actorUserId ?? null;
  const reason = req.body.reason ?? null;

  try {
    const result = await withTransaction(async (client: any) => {
      const rows = await client.query(
        `SELECT * FROM quotations WHERE id = $1 AND deleted = FALSE`,
        [id]
      );

      if (rows.rowCount === 0) throw new Error("Not found");

      const snap = rows.rows[0];
      const itemsRes = await client.query(
        `SELECT * FROM quotation_items WHERE quotation_id = $1`,
        [id]
      );

      const fullSnap = { ...snap, items: itemsRes.rows };

      await client.query(
        `UPDATE quotations SET 
          deleted = TRUE,
          deleted_at = NOW(),
          deleted_by = $1
         WHERE id = $2`,
        [actorUserId, id]
      );

      await client.query(
        `INSERT INTO quotation_trash 
         (original_id, snapshot_json, deleted_at, deleted_by, reason, retention_until)
         VALUES ($1,$2,NOW(),$3,$4,NOW() + ($5 || ' days')::interval)`,
        [id, JSON.stringify(fullSnap), actorUserId, reason, process.env.TRASH_RETENTION_DAYS || "30"]
      );

      await client.query(
        `INSERT INTO trash_logs (item_type, item_id, action, actor_user_id, reason)
         VALUES ('quotation',$1,'move',$2,$3)`,
        [id, actorUserId, reason]
      );

      return { ok: true };
    });

    res.json(result);

  } catch (err: any) {
    console.error("DELETE quotations error:", err);
    res.status(400).json({ error: err.message });
  }
});

// =====================================
// RESTORE
// =====================================

router.post("/quotations/:id/restore", async (req, res) => {
  const id = req.params.id;
  const actorUserId = req.body.actorUserId ?? null;

  try {
    const result = await withTransaction(async (client: any) => {
      await client.query(
        `UPDATE quotations SET deleted = FALSE, deleted_at = NULL, deleted_by = NULL WHERE id = $1`,
        [id]
      );

      await client.query(`DELETE FROM quotation_trash WHERE original_id = $1`, [id]);

      await client.query(
        `INSERT INTO trash_logs (item_type, item_id, action, actor_user_id)
         VALUES ('quotation',$1,'restore',$2)`,
        [id, actorUserId]
      );

      return { ok: true };
    });

    res.json(result);

  } catch (err: any) {
    console.error("RESTORE quotations error:", err);
    res.status(400).json({ error: err.message });
  }
});

// =====================================
// PERMANENT DELETE
// =====================================

router.delete("/trash/quotations/:id", async (req, res) => {
  const id = req.params.id;
  const actorUserId = req.body.actorUserId ?? null;

  try {
    const result = await withTransaction(async (client: any) => {
      await client.query(`DELETE FROM quotation_trash WHERE original_id = $1`, [id]);
      await client.query(`DELETE FROM quotation_items WHERE quotation_id = $1`, [id]);
      await client.query(`DELETE FROM quotations WHERE id = $1`, [id]);

      await client.query(
        `INSERT INTO trash_logs (item_type, item_id, action, actor_user_id)
         VALUES ('quotation',$1,'purge',$2)`,
        [id, actorUserId]
      );

      return { ok: true };
    });

    res.json(result);

  } catch (err: any) {
    console.error("PURGE quotations error:", err);
    res.status(400).json({ error: err.message });
  }
});

// =====================================
// CONVERT TO PROJECT
// =====================================

router.post("/quotations/:id/convert", async (req, res) => {
  const id = req.params.id;
  const actorUserId = req.body.actorUserId ?? null;

  try {
    const result = await withTransaction(async (client: any) => {
      const qRows = await client.query(`SELECT * FROM quotations WHERE id = $1`, [id]);
      if (qRows.rowCount === 0) throw new Error("Quotation not found");

      const quotation = qRows.rows[0];

      const pRes = await client.query(
        `INSERT INTO projects (
          project_name, client_name, client_contact, project_type,
          project_amount, status, start_date, created_by, quotation_id
        )
        VALUES ($1,$2,$3,$4,$5,'Ongoing',NOW(),$6,$7)
        RETURNING *`,
        [
          quotation.project_name,
          quotation.client_name,
          quotation.client_phone || quotation.client_contact || '',
          'Other',
          quotation.total,
          actorUserId,
          id
        ]
      );

      const project = pRes.rows[0];

      await client.query(
        `UPDATE quotations SET status = 'Converted', updated_at = NOW() WHERE id = $1`,
        [id]
      );

      return project;
    });

    res.status(201).json(result);

  } catch (err: any) {
    console.error("CONVERT quotation error:", err);
    res.status(400).json({ error: err.message });
  }
});
// =====================================
// DUPLICATE QUOTATION
// =====================================

router.post("/quotations/:id/duplicate", async (req, res) => {
  const id = req.params.id;
  const actorUserId = req.body.actorUserId ?? null;

  try {
    const result = await withTransaction(async (client: any) => {
      // 1. Fetch Source
      const qRows = await client.query(`SELECT * FROM quotations WHERE id = $1`, [id]);
      if (qRows.rowCount === 0) throw new Error("Quotation not found");
      const source = qRows.rows[0];

      // 2. Generate New Number
      const newNumber = await generateNextQuotationNumber(client);

      // 3. Create Copy
      // We copy everything EXCEPT: id, quotation_number, status, created_at, updated_at, deleted...
      // We set: status='Draft', created_by=actor
      const qRes = await client.query(
        `INSERT INTO quotations (
          project_name, quotation_number, client_name, client_contact, client_phone, 
          quotation_date, subtotal, discount_percent, discount_amount, tax_percent, tax_amount, total, 
          status, notes, include_terms, include_bank_details, bank_account_id, created_by
        )
        VALUES ($1,$2,$3,$4,$5,NOW(),$6,$7,$8,$9,$10,$11,'Draft',$12,$13,$14,$15,$16)
        RETURNING *`,
        [
          source.project_name,
          newNumber,
          source.client_name,
          source.client_contact,
          source.client_phone,
          // source.quotation_date, // Use NOW() for new date
          source.subtotal,
          source.discount_percent,
          source.discount_amount,
          source.tax_percent,
          source.tax_amount,
          source.total,
          source.notes,
          source.include_terms,
          source.include_bank_details,
          source.bank_account_id,
          actorUserId
        ]
      );
      const newQ = qRes.rows[0];

      // 4. Duplicate Items
      const itemsRes = await client.query(`SELECT * FROM quotation_items WHERE quotation_id = $1`, [id]);
      const sourceItems = itemsRes.rows;

      for (const item of sourceItems) {
        await client.query(
          `INSERT INTO quotation_items 
           (quotation_id, item, description, quantity, unit, rate, amount, is_additional)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            newQ.id,
            item.item,
            item.description,
            item.quantity,
            item.unit,
            item.rate,
            item.amount,
            item.is_additional
          ]
        );
      }

      // 5. Return mapped structure
      const allItems = await client.query(
        `SELECT * FROM quotation_items WHERE quotation_id = $1`,
        [newQ.id]
      );
      return mapQuotation(newQ, allItems.rows);
    });

    res.status(201).json(result);

  } catch (err: any) {
    console.error("DUPLICATE quotation error:", err);
    res.status(400).json({ error: err.message });
  }
});

// =====================================

export default router;
