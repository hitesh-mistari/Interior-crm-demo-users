const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export async function list() {
  const res = await fetch(`${API_BASE}/lead-interactions`);
  if (!res.ok) throw new Error("Failed to fetch lead interactions");
  return res.json();
}

export async function get(id: string) {
  const res = await fetch(`${API_BASE}/lead-interactions/${id}`);
  if (!res.ok) throw new Error("Failed to fetch lead interaction");
  return res.json();
}

export async function create(data: any) {
  const res = await fetch(`${API_BASE}/lead-interactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create lead interaction");
  return res.json();
}

export async function update(id: string, data: any) {
  const res = await fetch(`${API_BASE}/lead-interactions/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update lead interaction");
  return res.json();
}

export async function deleteLeadInteraction(id: string, reason?: string, actorUserId?: string) {
  const res = await fetch(`${API_BASE}/lead-interactions/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason, actorUserId }),
  });
  if (!res.ok) throw new Error("Failed to delete lead interaction");
  return res.json();
}

export async function restore(id: string, actorUserId: string) {
  const res = await fetch(`${API_BASE}/lead-interactions/${id}/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actorUserId }),
  });
  if (!res.ok) throw new Error("Failed to restore lead interaction");
  return res.json();
}

export async function purge(id: string, actorUserId: string) {
  const res = await fetch(`${API_BASE}/trash/lead-interactions/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actorUserId }),
  });
  if (!res.ok) throw new Error("Failed to purge lead interaction");
  return res.json();
}

export async function listTrash() {
  const res = await fetch(`${API_BASE}/trash/lead-interactions`);
  if (!res.ok) throw new Error("Failed to fetch lead interactions trash");
  return res.json();
}

export async function listTrashLogs() {
  const res = await fetch(`${API_BASE}/trash-logs`);
  if (!res.ok) throw new Error("Failed to fetch lead interactions trash logs");
  return res.json();
}