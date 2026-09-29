import type { SessionUser } from "./types";
import { SEED_IDS } from "./types";

const SESSION_KEY = "tb:session:v1";

export function getSession(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function setSession(user: SessionUser) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function createTravelerSession(input: {
  email: string;
  name: string;
  plan: SessionUser["plan"];
  operatorId?: string | null;
}): SessionUser {
  return {
    userId: SEED_IDS.traveler,
    operatorId: input.operatorId ?? SEED_IDS.operator,
    email: input.email,
    name: input.name,
    role: "traveler",
    plan: input.plan,
  };
}
