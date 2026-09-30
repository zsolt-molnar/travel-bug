'use client';

import { useState } from 'react';
import { ListControls } from '@/components/list-controls';
import { adminGet, adminPatch, adminPost } from '@/lib/admin-api';
import { pageFetcher, useServerList } from '@/lib/use-list-query';

type Agency = { id: string; name: string; brandConfig: unknown };

export default function AgenciesPage() {
  const list = useServerList<Agency>('agencies', pageFetcher(adminGet, '/agencies'));
  const [name, setName] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [managerName, setManagerName] = useState('');
  const [msg, setMsg] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await adminPost('/agencies', { name, managerEmail, managerName });
      setMsg('Agency created');
      setName('');
      setManagerEmail('');
      setManagerName('');
      await list.mutate();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Failed');
    }
  }

  function startEdit(agency: Agency) {
    setEditingId(agency.id);
    setEditName(agency.name);
    setMsg('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName('');
  }

  async function saveEdit(id: string) {
    const next = editName.trim();
    if (!next) {
      setMsg('Agency name is required');
      return;
    }
    setSavingId(id);
    setMsg('');
    try {
      await adminPatch(`/agencies/${id}`, { name: next });
      setEditingId(null);
      setEditName('');
      setMsg('Agency updated');
      await list.mutate();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Failed to update agency');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Agencies</h1>
        <p className="text-muted-foreground">Superadmin only.</p>
        {list.error ? (
          <p className="mt-2 text-sm text-red-700">
            Agencies require a superadmin session.
          </p>
        ) : null}
        {msg ? <p className="mt-2 text-sm text-muted-foreground">{msg}</p> : null}
      </div>

      <div className="space-y-3">
        <ListControls
          search={list.search}
          onSearchChange={list.setSearch}
          placeholder="Filter agencies…"
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
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {list.pageItems.map((a) => (
                <tr key={a.id} className="border-b border-border">
                  <td className="px-4 py-3">
                    {editingId === a.id ? (
                      <input
                        className="h-9 w-full max-w-xs rounded-lg border border-border px-2 font-medium"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        autoFocus
                      />
                    ) : (
                      <span className="font-medium">{a.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{a.id}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {editingId === a.id ? (
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          className="text-primary underline disabled:opacity-40"
                          disabled={savingId === a.id}
                          onClick={() => void saveEdit(a.id)}
                        >
                          {savingId === a.id ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          type="button"
                          className="text-muted-foreground underline"
                          onClick={cancelEdit}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="text-primary underline"
                        onClick={() => startEdit(a)}
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!list.isLoading && !list.total ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                    No agencies match.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <form
        onSubmit={onCreate}
        className="max-w-lg space-y-3 rounded-2xl border border-border bg-card p-6"
      >
        <h2 className="font-display text-xl font-semibold">Create agency</h2>
        <input
          className="h-11 w-full rounded-xl border border-border px-3"
          placeholder="Agency name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="h-11 w-full rounded-xl border border-border px-3"
          placeholder="Manager name"
          value={managerName}
          onChange={(e) => setManagerName(e.target.value)}
        />
        <input
          className="h-11 w-full rounded-xl border border-border px-3"
          placeholder="Manager email"
          type="email"
          value={managerEmail}
          onChange={(e) => setManagerEmail(e.target.value)}
        />
        <button
          type="submit"
          className="h-11 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Create
        </button>
      </form>
    </div>
  );
}
