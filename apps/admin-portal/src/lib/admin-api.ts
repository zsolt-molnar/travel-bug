export type AdminRole = 'superadmin' | 'agency_manager' | 'agency_agent';

export type AdminUser = {
  id: string;
  email: string;
  role: AdminRole | string;
  operatorId: string | null;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const TOKEN_KEY = 'tb:admin-token:v1';
const USER_KEY = 'tb:admin-user:v1';

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getAdminUser(): AdminUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AdminUser) : null;
  } catch {
    return null;
  }
}

export function getAdminRole(): AdminRole | null {
  const user = getAdminUser();
  if (!user) return null;
  return user.role as AdminRole;
}

export function setSession(accessToken: string, user: AdminUser) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken());
}

export function adminHeaders(json = true): HeadersInit {
  const token = getAccessToken();
  const headers: Record<string, string> = {};
  if (json) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function parseError(path: string, res: Response): Promise<never> {
  if (res.status === 401 && typeof window !== 'undefined') {
    clearSession();
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
  }
  let detail = '';
  try {
    const body = (await res.json()) as { message?: string | string[] };
    detail = Array.isArray(body.message) ? body.message.join(', ') : (body.message ?? '');
  } catch {
    /* ignore */
  }
  throw new Error(detail || `${path} ${res.status}`);
}

export async function adminLogin(
  email: string,
  password: string,
): Promise<{ accessToken: string; user: AdminUser }> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) await parseError('/auth/login', res);
  const data = (await res.json()) as {
    accessToken: string;
    user: AdminUser;
  };
  setSession(data.accessToken, data.user);
  return data;
}

export async function adminGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { headers: adminHeaders() });
  if (!res.ok) await parseError(path, res);
  return res.json() as Promise<T>;
}

export async function adminPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) await parseError(path, res);
  return res.json() as Promise<T>;
}

export async function adminPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers: adminHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) await parseError(path, res);
  return res.json() as Promise<T>;
}

export async function adminDelete<T = { ok: boolean }>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'DELETE',
    headers: adminHeaders(false),
  });
  if (!res.ok) await parseError(path, res);
  return res.json() as Promise<T>;
}

/** Multipart upload (do not set Content-Type — browser sets boundary). */
export async function adminUpload<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: adminHeaders(false),
    body: form,
  });
  if (!res.ok) await parseError(path, res);
  return res.json() as Promise<T>;
}

export { API_URL };
