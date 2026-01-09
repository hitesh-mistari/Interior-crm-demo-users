import express from "express";
import { z } from "zod";
import { query } from "../db";

const router = express.Router();

const PaymentSchema = z.object({
    teamMemberId: z.string().uuid(),
    amount: z.number(),
    paymentDate: z.string(), // ISO Date
    paymentMode: z.string().default('Cash'),
    paymentType: z.enum(['Full Payment', 'Instalment', 'Final']).default('Instalment'),
    notes: z.string().optional().nullable(),
    workEntryIds: z.array(z.string().uuid()).optional().default([]),
    createdBy: z.string().uuid().optional().nullable(),
});

const UpdateSchema = PaymentSchema.partial();

function mapPayment(row: any) {
    return {
        id: row.id,
        teamMemberId: row.team_member_id,
        amount: Number(row.amount),
        paymentDate: row.payment_date,
        paymentMode: row.payment_mode,
        paymentType: row.payment_type,
        notes: row.notes,
        workEntryIds: row.work_entry_ids,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

// LIST
router.get("/teams/payments", async (req, res) => {
    try {
        const { teamMemberId, startDate, endDate } = req.query;
        let sql = `SELECT * FROM team_payments WHERE 1=1`;
        const params: any[] = [];
        let i = 1;

        if (teamMemberId) {
            sql += ` AND team_member_id = $${i++}`;
            params.push(teamMemberId);
        }
        if (startDate) {
            sql += ` AND payment_date >= $${i++}`;
            params.push(startDate);
        }
        if (endDate) {
            sql += ` AND payment_date <= $${i++}`;
            params.push(endDate);
        }

        sql += ` ORDER BY payment_date DESC, created_at DESC`;
        const rows = await query(sql, params);
        res.json(rows.map(mapPayment));
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// CREATE
router.post("/teams/payments", async (req, res) => {
    try {
        const data = PaymentSchema.parse(req.body);

        // Start transaction (implicit in single query if possible, but here we need two)
        // ideally should be a transaction but for now sequential is fine or use BEGIN/COMMIT

        const result = await query(
            `INSERT INTO team_payments (team_member_id, amount, payment_date, payment_mode, payment_type, notes, work_entry_ids, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, NOW())
       RETURNING *`,
            [
                data.teamMemberId, data.amount, data.paymentDate,
                data.paymentMode, data.paymentType, data.notes ?? null, JSON.stringify(data.workEntryIds),
                data.createdBy ?? null
            ]
        );

        // If work entries are linked, mark them as Paid
        if (data.workEntryIds && data.workEntryIds.length > 0) {
            await query(
                `UPDATE team_work_entries 
                 SET payment_status = 'Paid' 
                 WHERE id = ANY($1::uuid[])`,
                [data.workEntryIds]
            );

            // Notify about work updates too? 
            // The frontend might need a refresh or we rely on the work list refetch.
            // Ideally we'd broadcast updates for each work item, but a refetch is safer/simpler.
        }

        const payment = mapPayment(result[0]);

        // Also broadcast work updates if any (optional but good for consistency)
        if (data.workEntryIds && data.workEntryIds.length > 0) {
        }

        res.status(201).json(payment);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// UPDATE
router.put("/teams/payments/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const data = UpdateSchema.parse(req.body);
        const sets: string[] = [];
        const vals: any[] = [];
        let i = 1;

        if (data.teamMemberId !== undefined) { sets.push(`team_member_id = $${i++}`); vals.push(data.teamMemberId); }
        if (data.amount !== undefined) { sets.push(`amount = $${i++}`); vals.push(data.amount); }
        if (data.paymentDate !== undefined) { sets.push(`payment_date = $${i++}`); vals.push(data.paymentDate); }
        if (data.paymentMode !== undefined) { sets.push(`payment_mode = $${i++}`); vals.push(data.paymentMode); }
        if (data.paymentType !== undefined) { sets.push(`payment_type = $${i++}`); vals.push(data.paymentType); }
        if (data.notes !== undefined) { sets.push(`notes = $${i++}`); vals.push(data.notes ?? null); }
        if (data.workEntryIds !== undefined) { sets.push(`work_entry_ids = $${i++}::jsonb`); vals.push(JSON.stringify(data.workEntryIds)); }

        sets.push(`updated_at = NOW()`);
        vals.push(id);

        const result = await query(
            `UPDATE team_payments SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
            vals
        );

        if (result.length === 0) return res.status(404).json({ error: "Not found" });
        const payment = mapPayment(result[0]);
        res.json(payment);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE (HARD)
router.delete("/teams/payments/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const result = await query(
            `DELETE FROM team_payments WHERE id = $1 RETURNING *`,
            [id]
        );
        if (result.length === 0) return res.status(404).json({ error: "Not found" });
        res.json({ ok: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
