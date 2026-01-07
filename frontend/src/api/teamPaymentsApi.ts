const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export async function list() {
    const res = await fetch(`${API_BASE}/teams/payments`, { credentials: 'include', cache: 'no-store' });
    if (!res.ok) throw new Error("Failed to fetch team payments");
    return res.json();
}

export async function create(data: any) {
    const res = await fetch(`${API_BASE}/teams/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: 'include',
    });
    if (!res.ok) throw new Error("Failed to create team payment");
    return res.json();
}

export async function update(id: string, data: any) {
    const res = await fetch(`${API_BASE}/teams/payments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: 'include',
    });
    if (!res.ok) throw new Error("Failed to update team payment");
    return res.json();
}

export async function remove(id: string) {
    const res = await fetch(`${API_BASE}/teams/payments/${id}`, {
        method: "DELETE",
        credentials: 'include',
    });
    if (!res.ok) throw new Error("Failed to delete team payment");
    return res.json();
}
