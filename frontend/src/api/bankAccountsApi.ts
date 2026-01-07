const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export async function list() {
  const res = await fetch(`${API_BASE}/bank-accounts`);
  if (!res.ok) throw new Error("Failed to fetch bank accounts");
  return res.json();
}

export async function get(id: string) {
  const res = await fetch(`${API_BASE}/bank-accounts/${id}`);
  if (!res.ok) throw new Error("Failed to fetch bank account");
  return res.json();
}

export async function create(data: any) {
  const res = await fetch(`${API_BASE}/bank-accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create bank account");
  return res.json();
}

export async function update(id: string, data: any) {
  const res = await fetch(`${API_BASE}/bank-accounts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update bank account");
  return res.json();
}

export async function deleteBankAccount(id: string, reason?: string, actorUserId?: string) {
  const res = await fetch(`${API_BASE}/bank-accounts/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason, actorUserId }),
  });
  if (!res.ok) throw new Error("Failed to delete bank account");
  return res.json();
}

export async function restore(id: string, actorUserId: string) {
  const res = await fetch(`${API_BASE}/bank-accounts/${id}/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actorUserId }),
  });
  if (!res.ok) throw new Error("Failed to restore bank account");
  return res.json();
}

export async function purge(id: string, actorUserId: string) {
  const res = await fetch(`${API_BASE}/trash/bank-accounts/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actorUserId }),
  });
  if (!res.ok) throw new Error("Failed to purge bank account");
  return res.json();
}

export async function listTrash() {
  const res = await fetch(`${API_BASE}/trash/bank-accounts`);
  if (!res.ok) throw new Error("Failed to fetch bank accounts trash");
  return res.json();
}

export async function listTrashLogs() {
  const res = await fetch(`${API_BASE}/trash-logs`);
  if (!res.ok) throw new Error("Failed to fetch bank accounts trash logs");
  return res.json();
}