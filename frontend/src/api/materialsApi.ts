const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export async function list() {
  const res = await fetch(`${API_BASE}/materials`);
  if (!res.ok) throw new Error("Failed to fetch materials");
  return res.json();
}

export async function get(id: string) {
  const res = await fetch(`${API_BASE}/materials/${id}`);
  if (!res.ok) throw new Error("Failed to fetch material");
  return res.json();
}

export async function create(data: any) {
  const res = await fetch(`${API_BASE}/materials`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create material");
  return res.json();
}

export async function update(id: string, data: any) {
  const res = await fetch(`${API_BASE}/materials/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update material");
  return res.json();
}

export async function deleteMaterial(id: string, reason?: string, actorUserId?: string) {
  const res = await fetch(`${API_BASE}/materials/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason, actorUserId }),
  });
  if (!res.ok) throw new Error("Failed to delete material");
  return res.json();
}

export async function restore(id: string, actorUserId: string) {
  const res = await fetch(`${API_BASE}/materials/${id}/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actorUserId }),
  });
  if (!res.ok) throw new Error("Failed to restore material");
  return res.json();
}

export async function purge(id: string, actorUserId: string) {
  const res = await fetch(`${API_BASE}/trash/materials/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actorUserId }),
  });
  if (!res.ok) throw new Error("Failed to purge material");
  return res.json();
}

export async function listTrash() {
  const res = await fetch(`${API_BASE}/trash/materials`);
  if (!res.ok) throw new Error("Failed to fetch materials trash");
  return res.json();
}

export async function listTrashLogs() {
  const res = await fetch(`${API_BASE}/trash-logs`);
  if (!res.ok) throw new Error("Failed to fetch materials trash logs");
  return res.json();
}