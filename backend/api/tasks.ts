import express from "express";
import { z } from "zod";
import { query, withTransaction } from "../db";

const router = express.Router();

// ==========================
// VALUE MAPPINGS
// ==========================
// DB: 'red', 'orange', 'yellow', 'green', ''
// FE: 'Urgent', 'High', 'Medium', 'Low'
const PRIORITY_MAP: Record<string, string> = {
  "Urgent": "red",
  "High": "orange",
  "Medium": "yellow",
  "Low": "green",
  // Reverse
  "red": "Urgent",
  "orange": "High",
  "yellow": "Medium",
  "green": "Low",
  "": "Medium" // Default
};

// DB: 'In Progress', 'Hold', 'Completed', 'Not Started'
// FE: 'To Do', 'In Progress', 'Review', 'Done', 'Cancelled'
const STATUS_MAP: Record<string, string> = {
  "Not Started": "Not Started",
  "To Do": "Not Started", // Legacy handler
  "In Progress": "In Progress",
  "Completed": "Completed",
  "Done": "Completed", // Legacy handler
  "Review": "Hold", // Legacy?
  // Reverse
  "Hold": "In Progress", // Map Hold back to In Progress if no better option
};

function toDbPriority(p?: string | null): string {
  return p ? (PRIORITY_MAP[p] || "") : "";
}

function toJsPriority(p?: string | null): string {
  return p ? (PRIORITY_MAP[p] || "Medium") : "Medium";
}

function toDbStatus(s?: string | null): string {
  // If it's already a valid DB status, return it
  if (s === "Not Started" || s === "In Progress" || s === "Completed") return s;
  return s ? (STATUS_MAP[s] || "Not Started") : "Not Started";
}

function toJsStatus(s?: string | null): string {
  // If we have an override in the map, use it. Otherwise pass through.
  // We want DB "Not Started" -> FE "Not Started"
  // DB "In Progress" -> FE "In Progress"
  // DB "Completed" -> FE "Completed"
  if (s === "Not Started" || s === "In Progress" || s === "Completed") return s;
  return s ? (STATUS_MAP[s] || "Not Started") : "Not Started";
}

// ==========================
// ZOD SCHEMA
// ==========================
const TaskSchema = z.object({
  projectId: z.string().uuid().optional().nullable().or(z.literal('')),
  assignedTo: z.string().optional().nullable().or(z.literal('')), // Allow any string, not just UUID
  title: z.string(),
  description: z.string().optional().nullable(),
  status: z.string().optional().nullable(),
  priority: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  estimatedHours: z.number().optional().nullable(),
  actualHours: z.number().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  createdBy: z.string().uuid().nullable().optional().or(z.literal('')),
});

const UpdateSchema = TaskSchema.partial();

function mapTask(row: any) {
  return {
    id: row.id,
    projectId: row.project_id,
    assignedTo: row.user_id, // Mapped from user_id
    title: row.task,         // Mapped from task
    description: "",         // Not in DB
    status: toJsStatus(row.status),
    priority: toJsPriority(row.priority),
    dueDate: row.date,       // Mapped from date
    estimatedHours: 0,       // Not in DB
    actualHours: 0,          // Not in DB
    tags: [],                // Not in DB
    createdBy: row.created_by,
    completed: row.completed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deleted: row.deleted,
    deletedAt: row.deleted_at,
    deletedBy: row.deleted_by
  };
}

// ==========================
// GET ALL TASKS
// ==========================
router.get("/tasks", async (req, res) => {
  try {
    const rows = await query(
      `SELECT *
       FROM tasks
       WHERE deleted = FALSE
       ORDER BY created_at DESC`
    );
    res.json(rows.map(mapTask));
  } catch (err) {
    console.error("GET tasks error:", err);
    res.status(500).json({ error: "Failed to get tasks" });
  }
});

// ==========================
// GET SINGLE TASK
// ==========================
router.get("/tasks/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const rows = await query(`SELECT * FROM tasks WHERE id = $1`, [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(mapTask(rows[0]));
  } catch (err) {
    res.status(500).json({ error: "Failed to get task" });
  }
});

// ==========================
// CREATE
// ==========================
router.post("/tasks", async (req, res) => {
  try {
    const data = TaskSchema.parse(req.body);

    // Handle empty string for projectId
    const projectId = (data.projectId && data.projectId.length > 0) ? data.projectId : null;
    const assignedTo = (data.assignedTo && data.assignedTo.length > 0) ? data.assignedTo : null;
    const createdBy = (data.createdBy && data.createdBy.length > 0)
      ? data.createdBy
      : ((req as any)?.user?.id ?? null);

    // Fallback: If no assignee is specified, assign to the creator
    const finalAssignedTo = assignedTo || createdBy;

    const result = await query(
      `INSERT INTO tasks (project_id, user_id, task, status, priority, date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        projectId,
        finalAssignedTo,
        data.title,
        toDbStatus(data.status),
        toDbPriority(data.priority),
        data.dueDate || new Date().toISOString(),
        createdBy
      ]
    );

    const final = mapTask(result[0]);
    res.status(201).json(final);
  } catch (err: any) {
    console.error("POST tasks error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================
// UPDATE
// ==========================
router.put("/tasks/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const data = UpdateSchema.parse(req.body);
    console.log(`PUT /tasks/${id}`, data);

    const sets: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (data.projectId !== undefined) {
      sets.push(`project_id = $${i++}`);
      values.push((data.projectId && data.projectId.length > 0) ? data.projectId : null);
    }
    if (data.assignedTo !== undefined) {
      sets.push(`user_id = $${i++}`);
      values.push((data.assignedTo && (data.assignedTo as string).length > 0) ? data.assignedTo : null);
    }
    if (data.title !== undefined) { sets.push(`task = $${i++}`); values.push(data.title); }
    if (data.status !== undefined) { sets.push(`status = $${i++}`); values.push(toDbStatus(data.status)); }
    if (data.priority !== undefined) { sets.push(`priority = $${i++}`); values.push(toDbPriority(data.priority)); }
    if (data.dueDate !== undefined) { sets.push(`date = $${i++}`); values.push(data.dueDate); }

    // Ignore other fields not in DB for now (description, hours, tags)

    sets.push(`updated_at = NOW()`);

    values.push(id);

    const result = await query(
      `UPDATE tasks SET ${sets.join(", ")} WHERE id = $${values.length} RETURNING *`,
      values
    );

    if (result.length === 0) return res.status(404).json({ error: "Not found" });
    const final = mapTask(result[0]);
    res.json(final);

  } catch (err: any) {
    console.error("PUT tasks error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================
// SOFT DELETE → trash
// ==========================
router.delete("/tasks/:id", async (req, res) => {
  const id = req.params.id;
  const actorUserId = req.body.actorUserId ?? null;
  const reason = req.body.reason ?? null;

  try {
    const result = await withTransaction(async (client: any) => {
      // get snapshot
      const rows = await client.query(
        `SELECT * FROM tasks WHERE id = $1 AND deleted = FALSE`,
        [id]
      );
      if (rows.rowCount === 0) throw new Error("Not found");

      const snap = rows.rows[0];

      // mark deleted
      await client.query(
        `UPDATE tasks
         SET deleted = TRUE, deleted_at = NOW(), deleted_by = $1
         WHERE id = $2`,
        [actorUserId, id]
      );

      // insert trash snapshot
      await client.query(
        `INSERT INTO task_trash (original_id, snapshot_json, deleted_at, deleted_by, reason, retention_until)
         VALUES ($1, $2, NOW(), $3, $4, NOW() + ($5 || ' days')::interval)`,
        [id, JSON.stringify(snap), actorUserId, reason, process.env.TRASH_RETENTION_DAYS || "30"]
      );

      // trash log
      await client.query(
        `INSERT INTO trash_logs (item_type, item_id, action, actor_user_id, reason)
         VALUES ('task', $1, 'move', $2, $3)`,
        [id, actorUserId, reason]
      );

      return { ok: true };
    });

    res.json(result);

  } catch (err: any) {
    console.error("DELETE tasks error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================
// RESTORE
// ==========================
router.post("/tasks/:id/restore", async (req, res) => {
  const id = req.params.id;
  const actorUserId = req.body.actorUserId ?? null;

  try {
    const result = await withTransaction(async (client: any) => {
      await client.query(
        `UPDATE tasks
         SET deleted = FALSE, deleted_at = NULL, deleted_by = NULL
         WHERE id = $1`,
        [id]
      );

      await client.query(`DELETE FROM task_trash WHERE original_id = $1`, [id]);

      await client.query(
        `INSERT INTO trash_logs (item_type, item_id, action, actor_user_id)
         VALUES ('task', $1, 'restore', $2)`,
        [id, actorUserId]
      );

      return { ok: true };
    });

    res.json(result);

  } catch (err: any) {
    console.error("RESTORE tasks error:", err);
    res.status(400).json({ error: err.message });
  }
});

// ==========================
// TRASH LIST
// ==========================
router.get("/trash/tasks", async (_req, res) => {
  try {
    const rows = await query(
      `SELECT * FROM task_trash ORDER BY deleted_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error("GET trash/tasks error:", err);
    res.status(500).json({ error: "Failed to get trash list" });
  }
});

// ==========================
// PERMANENT DELETE (PURGE)
// ==========================
router.delete("/trash/tasks/:id", async (req, res) => {
  const id = req.params.id;
  const actorUserId = req.body.actorUserId ?? null;

  try {
    const result = await withTransaction(async (client: any) => {
      await client.query(`DELETE FROM task_trash WHERE original_id = $1`, [id]);
      await client.query(`DELETE FROM tasks WHERE id = $1`, [id]);

      await client.query(
        `INSERT INTO trash_logs (item_type, item_id, action, actor_user_id)
         VALUES ('task', $1, 'purge', $2)`,
        [id, actorUserId]
      );

      return { ok: true };
    });

    res.json(result);

  } catch (err: any) {
    console.error("PURGE tasks error:", err);
    res.status(400).json({ error: err.message });
  }
});

export default router;
