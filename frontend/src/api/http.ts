const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  listTeamMembers: () => http('/team-members'),
  createTeamMember: (data: any) =>
    http('/team-members', { method: 'POST', body: JSON.stringify(data) }),
  updateTeamMember: (id: string, data: any) =>
    http(`/team-members/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTeamMember: (id: string, reason: string | null, deletedBy?: string) =>
    http(`/team-members/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason, deletedBy }),
    }),
  restoreTeamMember: (id: string, actorUserId?: string) =>
    http(`/team-members/${id}/restore`, {
      method: 'POST',
      body: JSON.stringify({ actorUserId }),
    }),
  purgeTeamMemberTrash: (id: string, actorUserId?: string) =>
    http(`/trash/team-members/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ actorUserId }),
    }),
  listTeamMemberTrash: () => http('/trash/team-members'),
  listTrashLogs: () => http('/trash/logs'),
};