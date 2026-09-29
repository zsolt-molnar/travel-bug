export type AdminRole =
  | "superadmin"
  | "agency_manager"
  | "agency_agent";

export const DEMO_IDENTITIES: Record<
  AdminRole,
  { userId: string; operatorId: string | null; role: AdminRole; label: string }
> = {
  superadmin: {
    userId: "00000000-0000-4000-8000-000000000011",
    operatorId: null,
    role: "superadmin",
    label: "Superadmin",
  },
  agency_manager: {
    userId: "00000000-0000-4000-8000-000000000012",
    operatorId: "00000000-0000-4000-8000-000000000001",
    role: "agency_manager",
    label: "Agency Manager",
  },
  agency_agent: {
    userId: "00000000-0000-4000-8000-000000000013",
    operatorId: "00000000-0000-4000-8000-000000000001",
    role: "agency_agent",
    label: "Agency Agent",
  },
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const ROLE_KEY = "tb:admin-role:v1";

export function getAdminRole(): AdminRole {
  if (typeof window === "undefined") return "agency_manager";
  return (localStorage.getItem(ROLE_KEY) as AdminRole) || "agency_manager";
}

export function setAdminRole(role: AdminRole) {
  localStorage.setItem(ROLE_KEY, role);
}

export function adminHeaders(): HeadersInit {
  const id = DEMO_IDENTITIES[getAdminRole()];
  return {
    "Content-Type": "application/json",
    "x-user-id": id.userId,
    "x-operator-id": id.operatorId ?? "null",
    "x-user-role": id.role,
  };
}

export async function adminGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { headers: adminHeaders() });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json() as Promise<T>;
}

export async function adminPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json() as Promise<T>;
}

export { API_URL };
