import { getSession } from "./auth";
import { SEED_IDS } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function apiHeaders(extra?: HeadersInit): HeadersInit {
  const session = getSession();
  return {
    "Content-Type": "application/json",
    "x-user-id": session?.userId ?? SEED_IDS.traveler,
    "x-operator-id": session?.operatorId ?? SEED_IDS.operator,
    "x-user-role": session?.role ?? "traveler",
    ...extra,
  };
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: apiHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: apiHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export { API_URL };
