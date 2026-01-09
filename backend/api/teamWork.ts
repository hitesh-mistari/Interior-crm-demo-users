import express from "express";
import { z } from "zod";
import { query } from "../db";

const router = express.Router();

const WorkEntrySchema = z.object({
    teamMemberId: z.string().uuid(),
    projectId: z.string().uuid().optional().nullable(),
    workDate: z.string(), // ISO Date
    taskName: z.string().min(1),
    quantity: z.number().default(1),
    rate: z.number(),
    amount: z.number(),
    paymentStatus: z.enum(['Pending', 'Paid', 'Partial']).default('Pending'),
    notes: z.string().optional().nullable(),
    receiptUrl: z.string().optional().nullable(),
    createdBy: z.string().uuid().optional().nullable(),
});

const UpdateSchema = WorkEntrySchema.partial();

function mapWork(row: any) {
    return {
        id: row.id,
        teamMemberId: row.team_member_id,
        projectId: row.project_id,
        workDate: row.work_date,
        taskName: row.task_name,
        quantity: Number(row.quantity),
        rate: Number(row.rate),
        amount: Number(row.amount),
        paymentStatus: row.payment_status,
        notes: row.notes,
        receiptUrl: row.receipt_url,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

// LIST
router.get("/teams/work", async (req, res) => {
    try {
        const { teamMemberId, projectId, startDate, endDate } = req.query;
        let sql = `SELECT * FROM team_work_entries WHERE 1=1`;
        const params: any[] = [];
        let i = 1;

        if (teamMemberId) {
            sql += ` AND team_member_id = $${i++}`;
            params.push(teamMemberId);
        }
        if (projectId) {
            sql += ` AND project_id = $${i++}`;
            params.push(projectId);
        }
        if (startDate) {
            sql += ` AND work_date >= $${i++}`;
            params.push(startDate);
        }
        if (endDate) {
            sql += ` AND work_date <= $${i++}`;
            params.push(endDate);
        }

        sql += ` ORDER BY work_date DESC, created_at DESC`;

        const rows = await query(sql, params);
        res.json(rows.map(mapWork));
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// CREATE
router.post("/teams/work", async (req, res) => {
    try {
        const data = WorkEntrySchema.parse(req.body);
        const result = await query(
            `INSERT INTO team_work_entries (team_member_id, project_id, work_date, task_name, quantity, rate, amount, payment_status, notes, receipt_url, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
       RETURNING *`,
            [
                data.teamMemberId, data.projectId ?? null, data.workDate,
                data.taskName, data.quantity, data.rate, data.amount,
                data.paymentStatus, data.notes ?? null, data.receiptUrl ?? null, data.createdBy ?? null
            ]
        );
        const work = mapWork(result[0]);
        res.status(201).json(work);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// UPDATE
router.put("/teams/work/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const data = UpdateSchema.parse(req.body);
        const sets: string[] = [];
        const vals: any[] = [];
        let i = 1;

        if (data.teamMemberId !== undefined) { sets.push(`team_member_id = $${i++}`); vals.push(data.teamMemberId); }
        if (data.projectId !== undefined) { sets.push(`project_id = $${i++}`); vals.push(data.projectId ?? null); }
        if (data.workDate !== undefined) { sets.push(`work_date = $${i++}`); vals.push(data.workDate); }
        if (data.taskName !== undefined) { sets.push(`task_name = $${i++}`); vals.push(data.taskName); }
        if (data.quantity !== undefined) { sets.push(`quantity = $${i++}`); vals.push(data.quantity); }
        if (data.rate !== undefined) { sets.push(`rate = $${i++}`); vals.push(data.rate); }
        if (data.amount !== undefined) { sets.push(`amount = $${i++}`); vals.push(data.amount); }
        if (data.paymentStatus !== undefined) { sets.push(`payment_status = $${i++}`); vals.push(data.paymentStatus); }
        if (data.notes !== undefined) { sets.push(`notes = $${i++}`); vals.push(data.notes ?? null); }
        if (data.receiptUrl !== undefined) { sets.push(`receipt_url = $${i++}`); vals.push(data.receiptUrl ?? null); }

        sets.push(`updated_at = NOW()`);
        vals.push(id);

        const result = await query(
            `UPDATE team_work_entries SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
            vals
        );

        if (result.length === 0) return res.status(404).json({ error: "Not found" });
        const work = mapWork(result[0]);
        res.json(work);
    } catch (err: any) {
        res.status(400).json({ error: err.message });
    }
});

// DELETE (HARD)
router.delete("/teams/work/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const result = await query(
            `DELETE FROM team_work_entries WHERE id = $1 RETURNING *`,
            [id]
        );
        if (result.length === 0) return res.status(404).json({ error: "Not found" });
        res.json({ ok: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
