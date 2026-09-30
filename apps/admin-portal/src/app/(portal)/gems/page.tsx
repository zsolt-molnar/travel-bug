'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  adminDelete,
  adminGet,
  adminPost,
  getAdminUser,
  type AdminUser,
} from '@/lib/admin-api';
import { ListControls } from '@/components/list-controls';
import { useServerList, type PageResult } from '@/lib/use-list-query';
import { cn } from '@/lib/utils';

type Place = {
  id: string;
  name: string;
  kind: string;
  parentId: string | null;
};

type Gem = {
  id: string;
  title: string;
  category: string;
  description: string;
  placeId: string;
  neighborhood: string | null;
  operatorId: string | null;
  tags: string[] | null;
};

const CATEGORIES = ['activity', 'eat', 'drink', 'shop', 'viewpoint', 'other'];

function placeLabel(place: Place, byId: Map<string, Place>) {
  const parts = [place.name];
  let cur = place.parentId ? byId.get(place.parentId) : undefined;
  while (cur) {
    parts.push(cur.name);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return parts.join(' · ');
}

export default function GemsPage() {
  const [user, setUser] = useState<AdminUser | null>(null);
  useEffect(() => {
    setUser(getAdminUser());
  }, []);
  const { data: places = [] } = useSWR('places', () => adminGet<Place[]>('/places'));
  const [placeId, setPlaceId] = useState('');
  const [browseParentId, setBrowseParentId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('activity');
  const [description, setDescription] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [msg, setMsg] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'platform' | 'agency'>('all');

  const byId = useMemo(() => {
    const map = new Map<string, Place>();
    for (const p of places) map.set(p.id, p);
    return map;
  }, [places]);

  const breadcrumb = useMemo(() => {
    const trail: Place[] = [];
    let cur = browseParentId ? byId.get(browseParentId) : undefined;
    while (cur) {
      trail.unshift(cur);
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return trail;
  }, [browseParentId, byId]);

  const children = useMemo(
    () =>
      places.filter((p) =>
        browseParentId === null ? p.parentId === null : p.parentId === browseParentId,
      ),
    [places, browseParentId],
  );

  const selectedPlace = placeId ? byId.get(placeId) : undefined;

  const gemFilters = useMemo(
    () => ({
      placeId: placeId || undefined,
      category: categoryFilter === 'all' ? undefined : categoryFilter,
      scope: scopeFilter === 'all' ? undefined : scopeFilter,
    }),
    [placeId, categoryFilter, scopeFilter],
  );

  const gemList = useServerList<Gem>(
    `gems:${placeId || 'none'}`,
    (query) => adminGet<PageResult<Gem>>(`/gems${query}`),
    { filters: gemFilters, enabled: Boolean(placeId) },
  );

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!placeId) {
      setMsg('Select a place first');
      return;
    }
    setMsg('');
    try {
      await adminPost('/gems', {
        placeId,
        title,
        category,
        description,
        neighborhood: neighborhood || undefined,
      });
      setTitle('');
      setDescription('');
      setNeighborhood('');
      setMsg('Gem created');
      await gemList.mutate();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Failed to create gem');
    }
  }

  async function onDelete(id: string) {
    if (!confirm('Delete this gem?')) return;
    await adminDelete(`/gems/${id}`);
    await gemList.mutate();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Gems</h1>
        <p className="text-muted-foreground">
          {user?.role === 'superadmin'
            ? 'Global catalog — gems you create are visible to every agency.'
            : 'Your agency gems plus platform gems created by admin.'}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-xl font-semibold">Places</h2>
          <div className="mt-3 flex flex-wrap items-center gap-1 text-sm">
            <button
              type="button"
              className="text-primary underline"
              onClick={() => setBrowseParentId(null)}
            >
              Root
            </button>
            {breadcrumb.map((p) => (
              <span key={p.id} className="flex items-center gap-1">
                <span className="text-muted-foreground">/</span>
                <button
                  type="button"
                  className="text-primary underline"
                  onClick={() => setBrowseParentId(p.id)}
                >
                  {p.name}
                </button>
              </span>
            ))}
          </div>

          <ul className="mt-4 space-y-1">
            {children.map((p) => {
              const hasKids = places.some((c) => c.parentId === p.id);
              const selected = placeId === p.id;
              return (
                <li
                  key={p.id}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm',
                    selected ? 'border-primary bg-primary/5' : 'border-border',
                  )}
                >
                  <button
                    type="button"
                    className="flex-1 text-left font-medium"
                    onClick={() => setPlaceId(p.id)}
                  >
                    {p.name}{' '}
                    <span className="font-normal text-muted-foreground">({p.kind})</span>
                  </button>
                  {hasKids ? (
                    <button
                      type="button"
                      className="text-xs text-primary underline"
                      onClick={() => setBrowseParentId(p.id)}
                    >
                      Open
                    </button>
                  ) : null}
                </li>
              );
            })}
            {!children.length ? (
              <li className="text-sm text-muted-foreground">No child places.</li>
            ) : null}
          </ul>

          {selectedPlace ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Selected:{' '}
              <span className="font-medium text-foreground">
                {placeLabel(selectedPlace, byId)}
              </span>
            </p>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Select a place to list and create gems.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-xl font-semibold">Create gem</h2>
          {!placeId ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Select a place on the left before creating a gem.
            </p>
          ) : (
            <form onSubmit={onCreate} className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Place:{' '}
                <span className="font-medium text-foreground">
                  {selectedPlace ? placeLabel(selectedPlace, byId) : placeId}
                </span>
              </p>
              <input
                className="h-11 w-full rounded-xl border border-border px-3"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <select
                className="h-11 w-full rounded-xl border border-border bg-background px-3"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <textarea
                className="min-h-24 w-full rounded-xl border border-border px-3 py-2"
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
              <input
                className="h-11 w-full rounded-xl border border-border px-3"
                placeholder="Neighborhood (optional)"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
              />
              {user?.role === 'superadmin' ? (
                <p className="text-xs text-muted-foreground">
                  Saves as a platform gem (visible to all agencies).
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Saves as an agency gem (only your agency + platform gems listed).
                </p>
              )}
              <button
                type="submit"
                disabled={!placeId}
                className="h-11 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                Create gem
              </button>
              {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
            </form>
          )}
        </section>
      </div>

      <section>
        <h2 className="font-semibold">
          Gems{selectedPlace ? ` in ${selectedPlace.name}` : ''}
        </h2>
        {gemList.error ? (
          <p className="mt-2 text-sm text-red-700">{String(gemList.error.message)}</p>
        ) : null}
        {!placeId ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Choose a place to load gems.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            <ListControls
              search={gemList.search}
              onSearchChange={gemList.setSearch}
              placeholder="Filter gems…"
              page={gemList.page}
              pageCount={gemList.pageCount}
              pageSize={gemList.pageSize}
              onPageChange={gemList.setPage}
              onPageSizeChange={gemList.setPageSize}
              from={gemList.from}
              to={gemList.to}
              total={gemList.total}
              filters={
                <>
                  <select
                    className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
                    value={categoryFilter}
                    onChange={(e) => {
                      setCategoryFilter(e.target.value);
                      gemList.setPage(1);
                    }}
                  >
                    <option value="all">All categories</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <select
                    className="h-10 rounded-xl border border-border bg-background px-3 text-sm"
                    value={scopeFilter}
                    onChange={(e) => {
                      setScopeFilter(e.target.value as typeof scopeFilter);
                      gemList.setPage(1);
                    }}
                  >
                    <option value="all">All scopes</option>
                    <option value="platform">Platform (admin)</option>
                    <option value="agency">Agency</option>
                  </select>
                </>
              }
            />
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Scope</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {gemList.pageItems.map((g) => (
                    <tr key={g.id} className="border-b border-border align-top">
                      <td className="px-4 py-3">
                        <p className="font-medium">{g.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {g.description}
                        </p>
                      </td>
                      <td className="px-4 py-3 capitalize">{g.category}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {g.operatorId ? 'Agency' : 'Platform (admin)'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {user?.role === 'superadmin' ||
                        (user?.operatorId && g.operatorId === user.operatorId) ? (
                          <button
                            type="button"
                            className="text-red-700 underline"
                            onClick={() => onDelete(g.id)}
                          >
                            Delete
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!gemList.total ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-6 text-center text-muted-foreground"
                      >
                        No gems match.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
