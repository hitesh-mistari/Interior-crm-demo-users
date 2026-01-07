const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

// GET all projects
export async function list() {
  const res = await fetch(`${API_BASE}/projects`);
  if (!res.ok) throw new Error("Failed to fetch projects");
  return res.json();
}

// GET single project
export async function get(id: string) {
  const res = await fetch(`${API_BASE}/projects/${id}`);
  if (!res.ok) throw new Error("Failed to fetch project");
  return res.json();
}

// CREATE project
export async function create(data: any) {
  const res = await fetch(`${API_BASE}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create project");
  return res.json();
}

// UPDATE project
export async function update(id: string, data: any) {
  const res = await fetch(`${API_BASE}/projects/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update project");
  return res.json();
}

// SOFT DELETE project
export async function deleteProject(
  id: string,
  actorUserId?: string,
  reason?: string
) {
  const res = await fetch(`${API_BASE}/projects/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actorUserId, reason }),
  });
  if (!res.ok) throw new Error("Failed to delete project");
  return res.json();
}

// RESTORE project
export async function restore(id: string, actorUserId?: string) {
  const res = await fetch(`${API_BASE}/projects/${id}/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actorUserId }),
  });
  if (!res.ok) throw new Error("Failed to restore project");
  return res.json();
}

// PERMANENT DELETE (PURGE)
export async function purge(id: string, actorUserId?: string) {
  const res = await fetch(`${API_BASE}/trash/projects/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actorUserId }),
  });
  if (!res.ok) throw new Error("Failed to purge project");
  return res.json();
}

// GET TRASH list
export async function listTrash() {
  const res = await fetch(`${API_BASE}/trash/projects`);
  if (!res.ok) throw new Error("Failed to fetch projects trash");
  return res.json();
}

// GET GLOBAL TRASH LOGS
export async function listTrashLogs() {
  const res = await fetch(`${API_BASE}/trash-logs`);
  if (!res.ok) throw new Error("Failed to fetch trash logs");
  return res.json();
}
