'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { ListControls } from '@/components/list-controls';
import { adminGet, getAdminRole } from '@/lib/admin-api';
import { pageFetcher, useServerList } from '@/lib/use-list-query';

type ClientUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  operatorId: string | null;
};

type Agency = { id: string; name: string };

export default function ClientsPage() {
  const role = getAdminRole();
  const isSuperadmin = role === 'superadmin';
  const list = useServerList<ClientUser>(
    'agency-clients',
    pageFetcher(adminGet, '/agencies/clients'),
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Clients</h1>
        <p className="text-muted-foreground">
          {isSuperadmin
            ? 'Traveler clients linked to agencies across the platform.'
            : 'Travelers linked to your agency. Add them to trips from each trip page.'}
        </p>
        {list.error ? (
          <p className="mt-2 text-sm text-red-700">
            Could not load clients.{' '}
            {list.error instanceof Error ? list.error.message : ''}
          </p>
        ) : null}
      </div>

      <div className="space-y-3">
        <ListControls
          search={list.search}
          onSearchChange={list.setSearch}
          placeholder="Filter clients…"
          page={list.page}
          pageCount={list.pageCount}
          pageSize={list.pageSize}
          onPageChange={list.setPage}
          onPageSizeChange={list.setPageSize}
          from={list.from}
          to={list.to}
          total={list.total}
        />
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                {isSuperadmin ? <th className="px-4 py-3">Agency</th> : null}
              </tr>
            </thead>
            <tbody>
              {list.pageItems.map((u) => (
                <tr key={u.id} className="border-b border-border">
                  <td className="px-4 py-3 font-medium">{u.name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
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
                    colSpan={isSuperadmin ? 3 : 2}
                    className="px-4 py-6 text-center text-muted-foreground"
                  >
                    No clients match.
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
