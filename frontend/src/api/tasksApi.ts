const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export async function list() {
  const res = await fetch(`${API_BASE}/tasks`, { credentials: 'include' });
  if (!res.ok) throw new Error("Failed to fetch tasks");
  return res.json();
}

export async function get(id: string) {
  const res = await fetch(`${API_BASE}/tasks/${id}`, { credentials: 'include' });
  if (!res.ok) throw new Error("Failed to fetch task");
  return res.json();
}

export async function create(data: any) {
  const res = await fetch(`${API_BASE}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: 'include',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to create task: ${res.status}`);
  }
  return res.json();
}

export async function update(id: string, data: any) {
  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: 'include',
  });
  if (!res.ok) throw new Error("Failed to update task");
  return res.json();
}

export async function deleteTask(id: string, reason?: string, actorUserId?: string) {
  const res = await fetch(`${API_BASE}/tasks/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason, actorUserId }),
    credentials: 'include',
  });
  if (!res.ok) {
    let msg = "Failed to delete task";
    try {
      const err = await res.json();
      msg = err.error || msg;
    } catch { }
    throw new Error(msg);
  }
  return res.json();
}

export async function restore(id: string, actorUserId: string) {
  const res = await fetch(`${API_BASE}/tasks/${id}/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actorUserId }),
    credentials: 'include',
  });
  if (!res.ok) throw new Error("Failed to restore task");
  return res.json();
}

export async function purge(id: string, actorUserId: string) {
  const res = await fetch(`${API_BASE}/trash/tasks/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actorUserId }),
    credentials: 'include',
  });
  if (!res.ok) throw new Error("Failed to purge task");
  return res.json();
}

export async function listTrash() {
  const res = await fetch(`${API_BASE}/trash/tasks`, { credentials: 'include' });
  if (!res.ok) throw new Error("Failed to fetch tasks trash");
  return res.json();
}

export async function listTrashLogs() {
  const res = await fetch(`${API_BASE}/trash-logs`, { credentials: 'include' });
  if (!res.ok) throw new Error("Failed to fetch tasks trash logs");
  return res.json();
}
