'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { adminGet, getAdminRole, type AdminRole } from '@/lib/admin-api';
import type { PageResult } from '@/lib/use-list-query';

async function countFrom(path: string) {
  const res = await adminGet<PageResult<{ id: string }>>(`${path}?page=1&pageSize=1`);
  return res.total;
}

export default function AdminDashboard() {
  const [role, setRole] = useState<AdminRole | null>(null);
  useEffect(() => {
    setRole(getAdminRole());
  }, []);

  const showPeople = role === 'superadmin' || role === 'agency_manager';

  const { data: tripCount } = useSWR('dash:trips', () => countFrom('/agencies/trips'));
  const { data: staffCount } = useSWR(showPeople ? 'dash:staff' : null, () =>
    countFrom('/agencies/staff'),
  );
  const { data: clientCount } = useSWR(showPeople ? 'dash:clients' : null, () =>
    countFrom('/agencies/clients'),
  );
  const { data: agencyCount } = useSWR(
    role === 'superadmin' ? 'dash:agencies' : null,
    () => countFrom('/agencies'),
  );

  const subtitle =
    role === 'superadmin'
      ? 'Global overview across all agencies.'
      : role === 'agency_manager'
        ? 'Your agency trips, staff, and clients.'
        : role === 'agency_agent'
          ? 'Trips assigned to your agency.'
          : 'Overview (POC).';

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">{subtitle}</p>
      <div
        className={`mt-8 grid gap-4 ${
          role === 'superadmin'
            ? 'md:grid-cols-4'
            : showPeople
              ? 'md:grid-cols-3'
              : 'md:grid-cols-1 max-w-sm'
        }`}
      >
        {role === 'superadmin' ? (
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">Agencies</p>
            <p className="mt-2 font-display text-4xl font-semibold">
              {agencyCount ?? '—'}
            </p>
          </div>
        ) : null}

        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            {role === 'superadmin' ? 'Agency trips' : 'Active trips'}
          </p>
          <p className="mt-2 font-display text-4xl font-semibold">{tripCount ?? '—'}</p>
        </div>

        {showPeople ? (
          <>
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-sm text-muted-foreground">Agency staff</p>
              <p className="mt-2 font-display text-4xl font-semibold">
                {staffCount ?? '—'}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <p className="text-sm text-muted-foreground">Agency clients</p>
              <p className="mt-2 font-display text-4xl font-semibold">
                {clientCount ?? '—'}
              </p>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
