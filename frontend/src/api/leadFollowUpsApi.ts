const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export async function list() {
  const res = await fetch(`${API_BASE}/lead-follow-ups`);
  if (!res.ok) throw new Error("Failed to fetch lead follow ups");
  return res.json();
}

export async function get(id: string) {
  const res = await fetch(`${API_BASE}/lead-follow-ups/${id}`);
  if (!res.ok) throw new Error("Failed to fetch lead follow up");
  return res.json();
}

export async function create(data: any) {
  const res = await fetch(`${API_BASE}/lead-follow-ups`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create lead follow up");
  return res.json();
}

export async function update(id: string, data: any) {
  const res = await fetch(`${API_BASE}/lead-follow-ups/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update lead follow up");
  return res.json();
}

export async function deleteLeadFollowUp(id: string, reason?: string, actorUserId?: string) {
  const res = await fetch(`${API_BASE}/lead-follow-ups/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason, actorUserId }),
  });
  if (!res.ok) throw new Error("Failed to delete lead follow up");
  return res.json();
}

export async function restore(id: string, actorUserId: string) {
  const res = await fetch(`${API_BASE}/lead-follow-ups/${id}/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actorUserId }),
  });
  if (!res.ok) throw new Error("Failed to restore lead follow up");
  return res.json();
}

export async function purge(id: string, actorUserId: string) {
  const res = await fetch(`${API_BASE}/trash/lead-follow-ups/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actorUserId }),
  });
  if (!res.ok) throw new Error("Failed to purge lead follow up");
  return res.json();
}

export async function listTrash() {
  const res = await fetch(`${API_BASE}/trash/lead-follow-ups`);
  if (!res.ok) throw new Error("Failed to fetch lead follow ups trash");
  return res.json();
}

export async function listTrashLogs() {
  const res = await fetch(`${API_BASE}/trash-logs`);
  if (!res.ok) throw new Error("Failed to fetch lead follow ups trash logs");
  return res.json();
}