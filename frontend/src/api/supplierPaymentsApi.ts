const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export async function list() {
  const res = await fetch(`${API_BASE}/supplier-payments`);
  if (!res.ok) throw new Error("Failed to fetch supplier payments");
  return res.json();
}

export async function get(id: string) {
  const res = await fetch(`${API_BASE}/supplier-payments/${id}`);
  if (!res.ok) throw new Error("Failed to fetch supplier payment");
  return res.json();
}

export async function create(data: any) {
  const res = await fetch(`${API_BASE}/supplier-payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create supplier payment");
  return res.json();
}

export async function update(id: string, data: any) {
  const res = await fetch(`${API_BASE}/supplier-payments/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update supplier payment");
  return res.json();
}

export async function deleteSupplierPayment(id: string, reason?: string, actorUserId?: string) {
  const res = await fetch(`${API_BASE}/supplier-payments/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason, actorUserId }),
  });
  if (!res.ok) throw new Error("Failed to delete supplier payment");
  return res.json();
}

export async function restore(id: string, actorUserId: string) {
  const res = await fetch(`${API_BASE}/supplier-payments/${id}/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actorUserId }),
  });
  if (!res.ok) throw new Error("Failed to restore supplier payment");
  return res.json();
}

export async function purge(id: string, actorUserId: string) {
  const res = await fetch(`${API_BASE}/trash/supplier-payments/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actorUserId }),
  });
  if (!res.ok) throw new Error("Failed to purge supplier payment");
  return res.json();
}

export async function listTrash() {
  const res = await fetch(`${API_BASE}/trash/supplier-payments`);
  if (!res.ok) throw new Error("Failed to fetch supplier payments trash");
  return res.json();
}

export async function listTrashLogs() {
  const res = await fetch(`${API_BASE}/trash-logs`);
  if (!res.ok) throw new Error("Failed to fetch supplier payments trash logs");
  return res.json();
}