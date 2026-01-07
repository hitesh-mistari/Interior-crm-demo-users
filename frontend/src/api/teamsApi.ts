const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export async function list() {
    const res = await fetch(`${API_BASE}/teams`, { credentials: 'include' });
    if (!res.ok) throw new Error("Failed to fetch teams");
    return res.json();
}

export async function get(id: string) {
    const res = await fetch(`${API_BASE}/teams/${id}`, { credentials: 'include' });
    if (!res.ok) throw new Error("Failed to fetch team member");
    return res.json();
}

export async function create(data: any) {
    const res = await fetch(`${API_BASE}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: 'include',
    });
    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to create team member" }));
        throw new Error(error.error || "Failed to create team member");
    }
    return res.json();
}

export async function update(id: string, data: any) {
    const res = await fetch(`${API_BASE}/teams/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: 'include',
    });
    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Failed to update team member" }));
        throw new Error(error.error || "Failed to update team member");
    }
    return res.json();
}

export async function remove(id: string) {
    const res = await fetch(`${API_BASE}/teams/${id}`, {
        method: "DELETE",
        credentials: 'include',
    });
    if (!res.ok) throw new Error("Failed to delete team member");
    return res.json();
}
