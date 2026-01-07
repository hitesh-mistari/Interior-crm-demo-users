const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export async function list() {
  const res = await fetch(`${API_BASE}/payments`);
  if (!res.ok) throw new Error("Failed to fetch payments");
  return res.json();
}

export async function get(id: string) {
  const res = await fetch(`${API_BASE}/payments/${id}`);
  if (!res.ok) throw new Error("Failed to fetch payment");
  return res.json();
}

export async function create(data: any) {
  const res = await fetch(`${API_BASE}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create payment");
  return res.json();
}

export async function update(id: string, data: any) {
  const res = await fetch(`${API_BASE}/payments/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update payment");
  return res.json();
}

export async function deletePayment(id: string, reason?: string, actorUserId?: string) {
  const res = await fetch(`${API_BASE}/payments/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason, actorUserId }),
  });
  if (!res.ok) throw new Error("Failed to delete payment");
  return res.json();
}

export async function restore(id: string, actorUserId: string) {
  const res = await fetch(`${API_BASE}/payments/${id}/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actorUserId }),
  });
  if (!res.ok) throw new Error("Failed to restore payment");
  return res.json();
}

export async function purge(id: string, actorUserId: string) {
  const res = await fetch(`${API_BASE}/trash/payments/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actorUserId }),
  });
  if (!res.ok) throw new Error("Failed to purge payment");
  return res.json();
}

export async function listTrash() {
  const res = await fetch(`${API_BASE}/trash/payments`);
  if (!res.ok) throw new Error("Failed to fetch payments trash");
  return res.json();
}

export async function listTrashLogs() {
  const res = await fetch(`${API_BASE}/trash-logs`);
  if (!res.ok) throw new Error("Failed to fetch payments trash logs");
  return res.json();
}