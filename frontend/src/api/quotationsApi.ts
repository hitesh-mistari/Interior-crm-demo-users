const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export async function list() {
  const res = await fetch(`${API_BASE}/quotations`);
  if (!res.ok) throw new Error("Failed to fetch quotations");
  return res.json();
}

export async function get(id: string) {
  const res = await fetch(`${API_BASE}/quotations/${id}`);
  if (!res.ok) throw new Error("Failed to fetch quotation");
  return res.json();
}

export async function create(data: any) {
  const res = await fetch(`${API_BASE}/quotations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to create quotation" }));
    throw new Error(err.error || "Failed to create quotation");
  }
  return res.json();
}

export async function update(id: string, data: any) {
  const res = await fetch(`${API_BASE}/quotations/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to update quotation" }));
    throw new Error(err.error || "Failed to update quotation");
  }
  return res.json();
}

export async function remove(id: string, reason?: string, actorUserId?: string) {
  const res = await fetch(`${API_BASE}/quotations/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason, actorUserId }),
  });
  if (!res.ok) throw new Error("Failed to delete quotation");
  return res.json();
}

export async function restore(id: string, actorUserId: string) {
  const res = await fetch(`${API_BASE}/quotations/${id}/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actorUserId }),
  });
  if (!res.ok) throw new Error("Failed to restore quotation");
  return res.json();
}

export async function purge(id: string, actorUserId: string) {
  const res = await fetch(`${API_BASE}/trash/quotations/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actorUserId }),
  });
  if (!res.ok) throw new Error("Failed to purge quotation");
  return res.json();
}

export async function listTrash() {
  const res = await fetch(`${API_BASE}/trash/quotations`);
  if (!res.ok) throw new Error("Failed to fetch quotations trash");
  return res.json();
}

export async function listTrashLogs() {
  const res = await fetch(`${API_BASE}/trash-logs`);
  if (!res.ok) throw new Error("Failed to fetch quotations trash logs");
  return res.json();
}

export async function convert(id: string, actorUserId?: string) {
  const res = await fetch(`${API_BASE}/quotations/${id}/convert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actorUserId }),
  });
  if (!res.ok) throw new Error("Failed to convert quotation to project");
  return res.json();
}

export async function duplicate(id: string, actorUserId: string) {
  const res = await fetch(`${API_BASE}/quotations/${id}/duplicate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actorUserId }),
  });
  if (!res.ok) throw new Error("Failed to duplicate quotation");
  return res.json();
}