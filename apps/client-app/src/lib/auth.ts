import type { AuthResponse, PlanType, SessionUser, UserRole } from './types';

const SESSION_KEY = 'tb:session:v1';

export function getSession(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionUser;
    if (!parsed?.accessToken || !parsed?.userId) return null;
    return parsed;
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

export function sessionFromAuth(
  response: AuthResponse,
  extras?: { name?: string; plan?: PlanType },
): SessionUser {
  const plan: PlanType =
    extras?.plan ?? (response.user.operatorId ? 'agency_invite' : 'individual_monthly');
  return {
    accessToken: response.accessToken,
    userId: response.user.id,
    operatorId: response.user.operatorId,
    email: response.user.email,
    name:
      extras?.name?.trim() || response.user.email.split('@')[0] || response.user.email,
    role: response.user.role as UserRole,
    plan,
  };
}
