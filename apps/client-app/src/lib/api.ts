import { getSession } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/** Bearer-only headers (e.g. FormData uploads — do not set Content-Type). */
export function authHeaders(extra?: HeadersInit): HeadersInit {
  const session = getSession();
  return {
    ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
    ...extra,
  };
}

/** JSON API headers with Bearer token. */
export function apiHeaders(extra?: HeadersInit): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...authHeaders(extra),
  };
}

async function parseError(res: Response, method: string, path: string) {
  let detail = '';
  try {
    const body = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) detail = body.message.join(', ');
    else if (body.message) detail = body.message;
  } catch {
    /* ignore */
  }
  throw new Error(detail || `${method} ${path} failed: ${res.status}`);
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: apiHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) await parseError(res, 'GET', path);
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) await parseError(res, 'POST', path);
  return res.json() as Promise<T>;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers: apiHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) await parseError(res, 'PATCH', path);
  return res.json() as Promise<T>;
}

export async function apiDelete<T = { ok: boolean }>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) await parseError(res, 'DELETE', path);
  return res.json() as Promise<T>;
}

export { API_URL };
