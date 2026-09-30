'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  clearSession,
  getAdminUser,
  type AdminRole,
  type AdminUser,
} from '@/lib/admin-api';
import { cn } from '@/lib/utils';

const links = [
  {
    href: '/',
    label: 'Dashboard',
    roles: ['superadmin', 'agency_manager', 'agency_agent'] as AdminRole[],
  },
  {
    href: '/agencies',
    label: 'Agencies',
    roles: ['superadmin'] as AdminRole[],
  },
  {
    href: '/places',
    label: 'Places',
    roles: ['superadmin', 'agency_manager', 'agency_agent'] as AdminRole[],
  },
  {
    href: '/trips',
    label: 'Trips',
    roles: ['superadmin', 'agency_manager', 'agency_agent'] as AdminRole[],
  },
  {
    href: '/gems',
    label: 'Gems',
    roles: ['superadmin', 'agency_manager', 'agency_agent'] as AdminRole[],
  },
  {
    href: '/staff',
    label: 'Staff',
    roles: ['superadmin', 'agency_manager'] as AdminRole[],
  },
  {
    href: '/clients',
    label: 'Clients',
    roles: ['superadmin', 'agency_manager'] as AdminRole[],
  },
];

function roleLabel(role: string) {
  switch (role) {
    case 'superadmin':
      return 'Superadmin';
    case 'agency_manager':
      return 'Agency Manager';
    case 'agency_agent':
      return 'Agency Agent';
    default:
      return role;
  }
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    setUser(getAdminUser());
  }, []);

  function logout() {
    clearSession();
    router.replace('/login');
  }

  const role = (user?.role ?? 'agency_manager') as AdminRole;

  return (
    <div className="flex min-h-dvh">
      <aside className="flex w-64 flex-col border-r border-border bg-card p-4">
        <p className="font-display text-xl font-semibold text-primary">
          Travel Bug Admin
        </p>
        <div className="mt-4 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs">
          <p className="font-medium text-foreground">{user?.email ?? 'Loading…'}</p>
          <p className="mt-0.5 text-muted-foreground">
            {user ? roleLabel(user.role) : '—'}
          </p>
        </div>
        <nav className="mt-6 flex flex-1 flex-col gap-1">
          {links
            .filter((l) => l.roles.includes(role))
            .map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium',
                  pathname === l.href || (l.href !== '/' && pathname.startsWith(l.href))
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted',
                )}
              >
                {l.label}
              </Link>
            ))}
        </nav>
        <button
          type="button"
          onClick={logout}
          className="mt-4 h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted"
        >
          Sign out
        </button>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
