const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export async function list() {
    const res = await fetch(`${API_BASE}/teams/work`, { credentials: 'include', cache: 'no-store' });
    if (!res.ok) throw new Error("Failed to fetch work entries");
    return res.json();
}

export async function create(data: any) {
    const res = await fetch(`${API_BASE}/teams/work`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: 'include',
    });
    if (!res.ok) throw new Error("Failed to create work entry");
    return res.json();
}

export async function update(id: string, data: any) {
    const res = await fetch(`${API_BASE}/teams/work/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: 'include',
    });
    if (!res.ok) throw new Error("Failed to update work entry");
    return res.json();
}

export async function remove(id: string) {
    const res = await fetch(`${API_BASE}/teams/work/${id}`, {
        method: "DELETE",
        credentials: 'include',
    });
    if (!res.ok) throw new Error("Failed to delete work entry");
    return res.json();
}
