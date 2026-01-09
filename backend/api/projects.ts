import express from "express";
import { z } from "zod";
import { query, withTransaction } from "../db";

const router = express.Router();

/* ======================================================
   NORMALIZER — convert "" / undefined → null
====================================================== */
function normalize(value: any) {
  return value === "" || value === undefined ? null : value;
}

/* ======================================================
   FRONTEND PAYLOAD SCHEMA (use consistent names)
   NOTE: expectedProfitPercentage is the canonical name
====================================================== */
const FrontendProjectSchema = z.object({
  projectName: z.string(),

  clientName: z.string().optional().nullable(),
  clientContact: z.string().optional().nullable(),
  projectType: z.string().optional().nullable(),

  status: z.string().optional().nullable(),

  startDate: z.string().optional().nullable(),
  deadline: z.string().optional().nullable(),

  projectAmount: z.union([z.number(), z.string()]).optional().nullable(),
  expectedProfitPercentage: z.union([z.number(), z.string()]).optional().nullable(),

  createdBy: z.string().uuid().optional().nullable(),
});

const UpdateSchema = FrontendProjectSchema.partial();

/* ======================================================
   STATUS HELPERS
====================================================== */
function toDbStatus(s?: string | null) {
  if (!s) return null;
  const v = s.toLowerCase();

  if (v === "ongoing") return "Ongoing";
  if (v === "completed") return "Completed";
  if (v === "cancelled" || v === "canceled") return "Cancelled";

  return null;
}

function fromDbStatus(s?: string | null) {
  if (!s) return "Ongoing";
  if (s === "Active") return "Ongoing";
  if (s === "Planning") return "Not Started";
  if (s === "On Hold") return "On Hold";
  if (s === "Completed") return "Completed";
  if (s === "Cancelled") return "Cancelled";
  return "Ongoing";
}

/* ======================================================
   GET ALL PROJECTS
====================================================== */
/* ======================================================
   GET ALL PROJECTS
====================================================== */
router.get("/projects", async (_req, res) => {
  try {
    const rows = await query(
      `SELECT 
         p.*,
         (SELECT COUNT(*)::int FROM tasks t WHERE t.project_id = p.id) AS total_tasks,
         (SELECT COUNT(*)::int FROM tasks t WHERE t.project_id = p.id AND t.status = 'Completed') AS completed_tasks
       FROM projects p
       ORDER BY p.id DESC`
    );

    const formatted = rows.map((row: any) => ({
      id: row.id,
      projectName: row.project_name,
      clientName: row.client_name,
      clientContact: row.client_contact,
      projectType: row.project_type,

      status: fromDbStatus(row.status),
      startDate: row.start_date,
      deadline: row.end_date, // use end_date as deadline

      projectAmount: row.project_amount ? Number(row.project_amount) : 0,
      expectedProfitPercentage: row.expected_profit_percentage ? Number(row.expected_profit_percentage) : 0,

      // Metrics
      totalTasks: row.total_tasks || 0,
      completedTasks: row.completed_tasks || 0,

      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json(formatted);
  } catch (err) {
    console.error("GET projects error:", err);
    res.status(500).json({ error: "Failed to get projects" });
  }
});

/* ======================================================
   CREATE PROJECT
====================================================== */
router.post("/projects", async (req, res) => {
  try {
    const data = FrontendProjectSchema.parse(req.body);

    const result = await query(
      `INSERT INTO projects (
        project_name,
        client_name,
        client_contact,
        project_type,
        start_date,
        deadline,
        project_amount,
        expected_profit_percentage,
        status,
        created_by,
        end_date
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *`,
      [
        normalize(data.projectName),
        normalize(data.clientName),
        normalize(data.clientContact),
        normalize(data.projectType),

        normalize(data.startDate),
        normalize(data.deadline),

        // store numeric values as numbers or null
        data.projectAmount !== undefined && data.projectAmount !== null
          ? Number(data.projectAmount)
          : null,
        data.expectedProfitPercentage !== undefined && data.expectedProfitPercentage !== null
          ? Number(data.expectedProfitPercentage)
          : null,

        toDbStatus(data.status),
        normalize(data.createdBy),

        normalize(data.deadline), // keep end_date in sync with deadline
      ]
    );

    res.status(201).json(result[0]);
  } catch (err: any) {
    console.error("POST projects error:", err);
    res.status(400).json({ error: err.message });
  }
});

/* ======================================================
   UPDATE PROJECT
====================================================== */
router.put("/projects/:id", async (req, res) => {
  try {
    const id = req.params.id;
    console.log(`PUT / projects / ${id} payload: `, JSON.stringify(req.body, null, 2));
    const data = UpdateSchema.parse(req.body);

    const sets: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (data.projectName !== undefined) {
      sets.push(`project_name = $${i++} `);
      values.push(normalize(data.projectName));
    }

    if (data.clientName !== undefined) {
      sets.push(`client_name = $${i++} `);
      values.push(normalize(data.clientName));
    }

    if (data.clientContact !== undefined) {
      sets.push(`client_contact = $${i++} `);
      values.push(normalize(data.clientContact));
    }

    if (data.projectType !== undefined) {
      sets.push(`project_type = $${i++} `);
      values.push(normalize(data.projectType));
    }

    if (data.status !== undefined) {
      sets.push(`status = $${i++} `);
      values.push(toDbStatus(data.status));
    }

    if (data.startDate !== undefined) {
      sets.push(`start_date = $${i++} `);
      values.push(normalize(data.startDate));
    }

    if (data.deadline !== undefined) {
      const d = normalize(data.deadline);
      sets.push(`deadline = $${i++} `);
      values.push(d);

      sets.push(`end_date = $${i++} `);
      values.push(d);
    }

    if (data.projectAmount !== undefined) {
      sets.push(`project_amount = $${i++} `);
      values.push(data.projectAmount !== null ? Number(data.projectAmount) : null);
    }

    if (data.expectedProfitPercentage !== undefined) {
      sets.push(`expected_profit_percentage = $${i++} `);
      values.push(
        data.expectedProfitPercentage !== null ? Number(data.expectedProfitPercentage) : null
      );
    }

    // nothing to update
    if (!sets.length) {
      return res.status(400).json({ error: "No valid fields provided to update" });
    }

    sets.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE projects SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING * `,
      values
    );

    if (!result.length) return res.status(404).json({ error: "Not found" });

    res.json(result[0]);
  } catch (err: any) {
    console.error("PUT projects error:", err);
    res.status(400).json({ error: err.message });
  }
});

/* ======================================================
   DELETE PROJECT (HARD DELETE)
====================================================== */
router.delete("/projects/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const result = await withTransaction(async (client) => {
      // 1. Cascading delete related entities
      // Expenses
      await client.query(
        `DELETE FROM expenses WHERE project_id = $1`,
        [id]
      );
      // Payments
      await client.query(
        `DELETE FROM payments WHERE project_id = $1`,
        [id]
      );
      // Materials
      await client.query(
        `DELETE FROM materials WHERE project_id = $1`,
        [id]
      );
      // Tasks
      await client.query(
        `DELETE FROM tasks WHERE project_id = $1`,
        [id]
      );
      // Team work entries
      await client.query(
        `DELETE FROM team_work_entries WHERE project_id = $1`,
        [id]
      );
      // Supplier payments (linked to expenses of this project)
      await client.query(
        `DELETE FROM supplier_payments 
         WHERE expense_id IN (SELECT id FROM expenses WHERE project_id = $1)`,
        [id]
      );

      // 2. Unset project from teams
      await client.query(
        `UPDATE teams SET assigned_project_id = NULL WHERE assigned_project_id = $1`,
        [id]
      );

      // 3. Delete the project
      const projectRes = await client.query(
        `DELETE FROM projects WHERE id = $1 RETURNING *`,
        [id]
      );

      if (projectRes.rowCount === 0) throw new Error("Project not found");
      const deletedProject = projectRes.rows[0];

      // 4. Revert quotation status if applicable
      if (deletedProject.quotation_id) {
        await client.query(
          `UPDATE quotations SET status = 'Approved' WHERE id = $1`,
          [deletedProject.quotation_id]
        );
      }

      return { success: true, id };
    });

    res.json(result);
  } catch (err: any) {
    console.error("DELETE project error:", err);
    res.status(err.message === "Project not found" ? 404 : 500).json({
      error: "Failed to delete project",
      details: err?.message
    });
  }
});

/* ======================================================
   TASK METRICS FOR PROJECT
====================================================== */
router.get("/projects/:id/task-metrics", async (req, res) => {
  try {
    const projectId = req.params.id;

    const [summary] = await query(
      `SELECT
    COUNT(*)::int AS total_tasks,
      SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END)::int AS completed_tasks,
        ROUND(
          CASE WHEN COUNT(*) = 0
             THEN 0
             ELSE(SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END):: numeric / COUNT(*):: numeric) * 100
           END,
          2
        )::float AS completion_percentage
       FROM tasks
       WHERE project_id = $1`,
      [projectId]
    );

    const statusRows = await query(
      `SELECT status, COUNT(*)::int AS count
       FROM tasks
       WHERE project_id = $1
       GROUP BY status
       ORDER BY status`,
      [projectId]
    );

    const priorityRows = await query(
      `SELECT priority, COUNT(*)::int AS count
       FROM tasks
       WHERE project_id = $1
       GROUP BY priority
       ORDER BY priority`,
      [projectId]
    );

    res.json({
      totalTasks: summary?.total_tasks ?? 0,
      completedTasks: summary?.completed_tasks ?? 0,
      completionPercentage: Number(summary?.completion_percentage ?? 0),
      statusBreakdown: statusRows.map((r: any) => ({ status: r.status, count: r.count })),
      priorityBreakdown: priorityRows.map((r: any) => ({ priority: r.priority, count: r.count })),
    });
  } catch (err) {
    console.error("GET /projects/:id/task-metrics error:", err);
    res.status(500).json({ error: "Failed to fetch task metrics" });
  }
});

export default router;
