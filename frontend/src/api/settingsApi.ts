const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export async function list() {
    const res = await fetch(`${API_BASE}/settings`, { credentials: 'include' });
    if (!res.ok) throw new Error("Failed to fetch settings");
    return res.json();
}

export async function update(key: string, value: string) {
    const res = await fetch(`${API_BASE}/settings/${key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
        credentials: 'include',
    });
    if (!res.ok) throw new Error("Failed to update setting");
    return res.json();
}

export async function updateBatch(updates: { key: string; value: string }[]) {
    const res = await fetch(`${API_BASE}/settings/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
        credentials: 'include',
    });
    if (!res.ok) throw new Error("Failed to update settings batch");
    return res.json();
}
