const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export async function list() {
  const res = await fetch(`${API_BASE}/notifications`);
  if (!res.ok) throw new Error("Failed to fetch notifications");
  return res.json();
}

export async function get(id: string) {
  const res = await fetch(`${API_BASE}/notifications/${id}`);
  if (!res.ok) throw new Error("Failed to fetch notification");
  return res.json();
}

export async function create(data: any) {
  const res = await fetch(`${API_BASE}/notifications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create notification");
  return res.json();
}

export async function update(id: string, data: any) {
  const res = await fetch(`${API_BASE}/notifications/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update notification");
  return res.json();
}

export async function deleteNotification(id: string, reason?: string, actorUserId?: string) {
  const res = await fetch(`${API_BASE}/notifications/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason, actorUserId }),
  });
  if (!res.ok) throw new Error("Failed to delete notification");
  return res.json();
}

export async function restore(id: string, actorUserId: string) {
  const res = await fetch(`${API_BASE}/notifications/${id}/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actorUserId }),
  });
  if (!res.ok) throw new Error("Failed to restore notification");
  return res.json();
}

export async function purge(id: string, actorUserId: string) {
  const res = await fetch(`${API_BASE}/trash/notifications/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actorUserId }),
  });
  if (!res.ok) throw new Error("Failed to purge notification");
  return res.json();
}

export async function listTrash() {
  const res = await fetch(`${API_BASE}/trash/notifications`);
  if (!res.ok) throw new Error("Failed to fetch notifications trash");
  return res.json();
}

export async function listTrashLogs() {
  const res = await fetch(`${API_BASE}/trash-logs`);
  if (!res.ok) throw new Error("Failed to fetch notifications trash logs");
  return res.json();
}

export async function markRead(id: string) {
  const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to mark notification as read");
  return res.json();
}

export async function markAllRead() {
  const res = await fetch(`${API_BASE}/notifications/read-all`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to mark all notifications as read");
  return res.json();
}