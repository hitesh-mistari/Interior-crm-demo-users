export const AUTH_TOKEN_KEY = 'auth_token';
export const AUTH_USER_KEY = 'auth_user';
export const REFRESH_TOKEN_KEY = 'auth_refresh_token';

// Use localStorage for persistence to handle incognito/refresh reliability
// While less secure than memory-only, it is required for robust user experience if cookies are blocked.
export function setAuthToken(token: string) {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

// Also persist user object for better UX (optional but consistent)
export function setAuthUser(user: any) {
  if (user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_USER_KEY);
  }
}

export function getAuthUser(): any | null {
  const u = localStorage.getItem(AUTH_USER_KEY);
  try {
    return u ? JSON.parse(u) : null;
  } catch {
    return null;
  }
}

export function clearAuthUser() {
  localStorage.removeItem(AUTH_USER_KEY);
}

// Refresh token is handled by HTTP-only cookies on the backend
// We don't need to store it in localStorage
export function setRefreshToken(_token: string) {
  // NO-OP: Refresh token is stored in HTTP-only cookie by backend
}

export function getRefreshToken(): string | null {
  // NO-OP: Refresh token is in HTTP-only cookie, not accessible to JS
  return null;
}

export function clearRefreshToken() {
  // NO-OP: Backend clears the HTTP-only cookie on logout
}
