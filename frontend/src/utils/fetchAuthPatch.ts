import { getAuthToken, setAuthToken, getRefreshToken } from './auth';
const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000/api';
const BASE = API_BASE.replace(/\/(api)?$/, '/api');

let patched = false;

export function patchAuthFetch() {
  if (patched || typeof window === 'undefined' || !(window as any).fetch) return;
  const originalFetch = (window as any).fetch.bind(window);
  (window as any).fetch = async (input: RequestInfo, init?: RequestInit) => {
    try {
      const token = getAuthToken();
      if (token) {
        const headers = new Headers((init && init.headers) || {});
        if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
        init = { ...(init || {}), headers, credentials: (init as any)?.credentials || 'include' } as any;
      }
    } catch { }
    const res = await originalFetch(input, init);
    if (res.status !== 401) return res;
    // attempt refresh once
    try {
      const refreshInit: RequestInit = { method: 'POST', credentials: 'include' };
      let refreshRes = await originalFetch(`${BASE}/auth/refresh`, refreshInit);
      if (!refreshRes.ok) {
        const rt = getRefreshToken();
        if (rt) {
          refreshRes = await originalFetch(`${BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: rt }),
          });
        }
      }
      if (refreshRes.ok) {
        const data = await refreshRes.json().catch(() => ({}));
        const newAccess = data.token || data.access_token || data.jwt || data.sessionToken || data.accessToken;
        if (newAccess) setAuthToken(newAccess);
        const headers = new Headers((init && (init as any).headers) || {});
        if (!headers.has('Authorization')) headers.set('Authorization', `Bearer ${newAccess}`);
        const retryInit = { ...(init || {}), headers, credentials: (init as any)?.credentials || 'include' } as any;
        return originalFetch(input, retryInit);
      }
    } catch {}
    return res;
  };
  patched = true;
}
