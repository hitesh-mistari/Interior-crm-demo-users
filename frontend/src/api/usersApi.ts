const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export async function list() {
  const res = await fetch(`${API_BASE}/users`, { credentials: 'include' });
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

export async function get(id: string) {
  const res = await fetch(`${API_BASE}/users/${id}`, { credentials: 'include' });
  if (!res.ok) throw new Error("Failed to fetch user");
  return res.json();
}

export async function create(data: any) {
  const res = await fetch(`${API_BASE}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: 'include',
  });
  if (!res.ok) throw new Error("Failed to create user");
  return res.json();
}

export async function update(id: string, data: any) {
  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: 'include',
  });
  if (!res.ok) throw new Error("Failed to update user");
  return res.json();
}

export async function deleteUser(id: string, reason?: string, actorUserId?: string) {
  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason, actorUserId }),
    credentials: 'include',
  });
  if (!res.ok) throw new Error("Failed to delete user");
  return res.json();
}

export async function restore(id: string, actorUserId?: string) {
  const res = await fetch(`${API_BASE}/users/${id}/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actorUserId }),
    credentials: 'include',
  });
  if (!res.ok) throw new Error("Failed to restore user");
  return res.json();
}

// ✔ Correct purge endpoint
export async function purge(id: string, actorUserId?: string) {
  const res = await fetch(`${API_BASE}/trash/users/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actorUserId })
  });
  if (!res.ok) throw new Error("Failed to purge user");
  return res.json();
}

// ✔ Correct trash list endpoint
export async function listTrash() {
  const res = await fetch(`${API_BASE}/trash/users`);
  if (!res.ok) throw new Error("Failed to fetch users trash");
  return res.json();
}

// ✔ Correct global trash logs endpoint
export async function listTrashLogs() {
  const res = await fetch(`${API_BASE}/trash-logs`);
  if (!res.ok) throw new Error("Failed to fetch trash logs");
  return res.json();
}
