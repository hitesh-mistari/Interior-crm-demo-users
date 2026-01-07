const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

// 🧹 Always sanitize outgoing data
function cleanPayload(data: any) {
  return {
    ...data,

    // Always an array — NEVER undefined, null, "", or something else
    receiptImages: Array.isArray(data.receiptImages)
      ? data.receiptImages.filter(Boolean)
      : [],

    // Items must be array
    items: Array.isArray(data.items) ? data.items : [],

    // Never send undefined
    tempSupplierName: data.tempSupplierName ?? null,
    supplierId: data.supplierId || null,
  };
}

export async function list() {
  const res = await fetch(`${API_BASE}/expenses`);
  if (!res.ok) throw new Error("Failed to fetch expenses");
  return res.json();
}

export async function get(id: string) {
  const res = await fetch(`${API_BASE}/expenses/${id}`);
  if (!res.ok) throw new Error("Failed to fetch expense");
  return res.json();
}

const DEBUG = Boolean(import.meta.env.VITE_DEBUG);

export async function create(data: any) {
  const safeData = cleanPayload(data);

  if (DEBUG) console.log("🔥 CREATE DATA:", safeData);

  const res = await fetch(`${API_BASE}/expenses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(safeData),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (DEBUG) console.error("CREATE FAILED:", json);
    throw new Error(json.error || "Failed to create expense");
  }

  return json;
}

export async function update(id: string, expense: any) {
  const safeData = cleanPayload(expense);

  if (DEBUG) console.log("🔥 SENDING UPDATE DATA:", safeData);

  const res = await fetch(`${API_BASE}/expenses/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(safeData),
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (DEBUG) console.error("UPDATE FAILED:", json);
    alert(`Update failed: ${json.error}`);
    throw new Error(json.error || "Failed to update expense");
  }

  return json;
}

export async function deleteExpense(id: string) {
  const res = await fetch(`${API_BASE}/expenses/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete expense");
  return res.json();
}

export async function restore(id: string, actorUserId: string) {
  const res = await fetch(`${API_BASE}/expenses/${id}/restore`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actorUserId }),
  });
  if (!res.ok) throw new Error("Failed to restore expense");
  return res.json();
}

export async function purge(id: string, actorUserId: string) {
  const res = await fetch(`${API_BASE}/trash/expenses/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actorUserId }),
  });
  if (!res.ok) throw new Error("Failed to purge expense");
  return res.json();
}

export async function listTrash() {
  const res = await fetch(`${API_BASE}/trash/expenses`);
  if (!res.ok) throw new Error("Failed to fetch expenses trash");
  return res.json();
}

export async function listTrashLogs() {
  const res = await fetch(`${API_BASE}/trash-logs`);
  if (!res.ok) throw new Error("Failed to fetch expenses trash logs");
  return res.json();
}
