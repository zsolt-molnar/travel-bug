'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { ListControls } from '@/components/list-controls';
import { adminGet, adminPost, getAdminRole } from '@/lib/admin-api';
import { pageFetcher, useServerList } from '@/lib/use-list-query';

type StaffUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  operatorId: string | null;
};

type Agency = { id: string; name: string };

export default function StaffPage() {
  const role = getAdminRole();
  const isSuperadmin = role === 'superadmin';
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'agency_manager' | 'agency_agent'>(
    'all',
  );

  const filters = useMemo(
    () => ({
      role: roleFilter === 'all' ? undefined : roleFilter,
    }),
    [roleFilter],
  );

  const list = useServerList<StaffUser>(
    'agency-staff',
    pageFetcher(adminGet, '/agencies/staff'),
    { filters },
  );

  const { data: agencies = [] } = useSWR(isSuperadmin ? 'agencies-all' : null, () =>
    adminGet<{ items?: Agency[] } | Agency[]>('/agencies?page=1&pageSize=100').then(
      (res) => (Array.isArray(res) ? res : (res.items ?? [])),
    ),
  );

  const agencyName = useMemo(() => {
    const map = new Map(agencies.map((a) => [a.id, a.name]));
    return (operatorId: string | null) =>
      operatorId ? (map.get(operatorId) ?? operatorId.slice(0, 8)) : '—';
  }, [agencies]);

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    await adminPost('/agencies/staff', { email, name });
    setEmail('');
    setName('');
    await list.mutate();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Staff</h1>
        <p className="text-muted-foreground">
          {isSuperadmin
            ? 'Agency managers and agents across the platform.'
            : 'Invite and manage agents for your agency.'}
        </p>
        {list.error ? (
          <p className="mt-2 text-sm text-red-700">
            Could not load staff. {list.error instanceof Error ? list.error.message : ''}
          </p>
        ) : null}
      </div>

      {!isSuperadmin ? (
        <form
          onSubmit={onInvite}
          className="grid max-w-lg gap-3 rounded-2xl border border-border bg-card p-6"
        >
          <input
            className="h-11 rounded-xl border border-border px-3"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className="h-11 rounded-xl border border-border px-3"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button
            type="submit"
            className="h-11 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Invite agent
          </button>
        </form>
      ) : null}

      <div className="space-y-3">
        <ListControls
          search={list.search}
          onSearchChange={list.setSearch}
          placeholder="Filter staff…"
          page={list.page}
          pageCount={list.pageCount}
          pageSize={list.pageSize}
          onPageChange={list.setPage}
          onPageSizeChange={list.setPageSize}
          from={list.from}
          to={list.to}
          total={list.total}
          filters={
            <select
              className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as typeof roleFilter);
                list.setPage(1);
              }}
            >
              <option value="all">All roles</option>
              <option value="agency_manager">Managers</option>
              <option value="agency_agent">Agents</option>
            </select>
          }
        />
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                {isSuperadmin ? <th className="px-4 py-3">Agency</th> : null}
              </tr>
            </thead>
            <tbody>
              {list.pageItems.map((u) => (
                <tr key={u.id} className="border-b border-border">
                  <td className="px-4 py-3 font-medium">{u.name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3 capitalize">{u.role.replace('_', ' ')}</td>
                  {isSuperadmin ? (
                    <td className="px-4 py-3 text-muted-foreground">
                      {agencyName(u.operatorId)}
                    </td>
                  ) : null}
                </tr>
              ))}
              {!list.isLoading && !list.total ? (
                <tr>
                  <td
                    colSpan={isSuperadmin ? 4 : 3}
                    className="px-4 py-6 text-center text-muted-foreground"
                  >
                    No staff match.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
