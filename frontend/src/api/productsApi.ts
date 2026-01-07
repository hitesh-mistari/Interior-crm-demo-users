const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export async function list() {
  const res = await fetch(`${API_BASE}/products`);
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}

export async function get(id: string) {
  const res = await fetch(`${API_BASE}/products/${id}`);
  if (!res.ok) throw new Error("Failed to fetch product");
  return res.json();
}

export async function create(data: any) {
  const res = await fetch(`${API_BASE}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create product");
  return res.json();
}

export async function update(id: string, data: any) {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update product");
  return res.json();
}

export async function deleteProduct(id: string, reason?: string, actorUserId?: string) {
  const res = await fetch(`${API_BASE}/products/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason, actorUserId }),
  });
  if (!res.ok) throw new Error("Failed to delete product");
  return res.json();
}

export async function restore(id: string, actorUserId: string) {
  const res = await fetch(`${API_BASE}/products/${id}/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actorUserId }),
  });
  if (!res.ok) throw new Error("Failed to restore product");
  return res.json();
}

export async function purge(id: string, actorUserId: string) {
  const res = await fetch(`${API_BASE}/trash/products/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actorUserId }),
  });
  if (!res.ok) throw new Error("Failed to purge product");
  return res.json();
}

export async function listTrash() {
  const res = await fetch(`${API_BASE}/trash/products`);
  if (!res.ok) throw new Error("Failed to fetch products trash");
  return res.json();
}

export async function listTrashLogs() {
  const res = await fetch(`${API_BASE}/trash-logs`);
  if (!res.ok) throw new Error("Failed to fetch products trash logs");
  return res.json();
}