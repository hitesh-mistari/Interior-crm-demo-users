const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export async function list() {
  const res = await fetch(`${API_BASE}/trash-logs`);
  if (!res.ok) throw new Error("Failed to fetch trash logs");
  return res.json();
}

export async function get(id: string) {
  const res = await fetch(`${API_BASE}/trash-logs/${id}`);
  if (!res.ok) throw new Error("Failed to fetch trash log");
  return res.json();
}

export async function create(data: any) {
  const res = await fetch(`${API_BASE}/trash-logs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create trash log");
  return res.json();
}

export async function update(id: string, data: any) {
  const res = await fetch(`${API_BASE}/trash-logs/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update trash log");
  return res.json();
}

export async function deleteTrashLog(id: string, reason?: string, actorUserId?: string) {
  const res = await fetch(`${API_BASE}/trash-logs/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason, actorUserId }),
  });
  if (!res.ok) throw new Error("Failed to delete trash log");
  return res.json();
}

export async function restore(id: string, actorUserId: string) {
  const res = await fetch(`${API_BASE}/trash-logs/${id}/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actorUserId }),
  });
  if (!res.ok) throw new Error("Failed to restore trash log");
  return res.json();
}

export async function purge(id: string, actorUserId: string) {
  const res = await fetch(`${API_BASE}/trash/trash-logs/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actorUserId }),
  });
  if (!res.ok) throw new Error("Failed to purge trash log");
  return res.json();
}

export async function listTrash() {
  const res = await fetch(`${API_BASE}/trash/trash-logs`);
  if (!res.ok) throw new Error("Failed to fetch trash logs trash");
  return res.json();
}

export async function listTrashLogs() {
  const res = await fetch(`${API_BASE}/trash-logs`);
  if (!res.ok) throw new Error("Failed to fetch trash logs trash logs");
  return res.json();
}