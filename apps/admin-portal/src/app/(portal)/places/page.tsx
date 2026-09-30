'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  adminDelete,
  adminGet,
  adminPatch,
  adminPost,
  getAdminRole,
} from '@/lib/admin-api';
import { ListControls } from '@/components/list-controls';
import { useServerList, type PageResult } from '@/lib/use-list-query';

type Place = {
  id: string;
  name: string;
  kind: string;
  parentId: string | null;
  lat: string | null;
  lng: string | null;
};

const KINDS = ['country', 'region', 'city', 'area'] as const;
type PlaceKind = (typeof KINDS)[number];

/** Kinds that belong as children of the active browse node (first = default filter). */
function childKindsFor(parentKind: string | null | undefined): readonly PlaceKind[] {
  if (!parentKind) return ['country'];
  if (parentKind === 'country') return ['city', 'region'];
  if (parentKind === 'region') return ['city', 'area'];
  if (parentKind === 'city') return ['area'];
  return ['area'];
}

export default function PlacesPage() {
  const role = getAdminRole();
  const canManage = role === 'superadmin';
  // Full catalog for breadcrumb / has-children checks (small geography set)
  const { data: places = [], mutate: mutateTree } = useSWR('places', () =>
    adminGet<Place[]>('/places'),
  );

  const [browseParentId, setBrowseParentId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<PlaceKind>('country');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [msg, setMsg] = useState('');
  const [kindFilter, setKindFilter] = useState<'all' | PlaceKind>('country');

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

  const parent = browseParentId ? byId.get(browseParentId) : null;
  const allowedKinds = useMemo(() => childKindsFor(parent?.kind), [parent?.kind]);
  const suggestedKind = allowedKinds[0] ?? 'country';

  // Keep list filter + create kind aligned with the active tree node
  useEffect(() => {
    setKindFilter(suggestedKind);
    setKind(suggestedKind);
  }, [browseParentId, suggestedKind]);

  const placeFilters = useMemo(
    () => ({
      parentId: browseParentId ?? 'null',
      kind: kindFilter === 'all' ? undefined : kindFilter,
    }),
    [browseParentId, kindFilter],
  );

  const placeList = useServerList<Place>(
    `places-page:${browseParentId ?? 'root'}`,
    (query) => adminGet<PageResult<Place>>(`/places${query}`),
    { filters: placeFilters },
  );

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    setMsg('');
    try {
      await adminPost('/places', {
        name,
        kind,
        parentId: browseParentId,
        lat: lat || undefined,
        lng: lng || undefined,
      });
      setName('');
      setLat('');
      setLng('');
      setMsg('Place created');
      await Promise.all([mutateTree(), placeList.mutate()]);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Failed to create place');
    }
  }

  async function rename(place: Place) {
    if (!canManage) return;
    const next = prompt('Rename place', place.name);
    if (!next || next === place.name) return;
    await adminPatch(`/places/${place.id}`, { name: next });
    await Promise.all([mutateTree(), placeList.mutate()]);
  }

  async function remove(place: Place) {
    if (!canManage) return;
    if (
      !confirm(
        `Delete “${place.name}”? Child places are removed too. Gems must not reference it.`,
      )
    ) {
      return;
    }
    setMsg('');
    try {
      await adminDelete(`/places/${place.id}`);
      if (browseParentId === place.id) setBrowseParentId(place.parentId);
      await Promise.all([mutateTree(), placeList.mutate()]);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Places</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Places are the shared geography tree (not owned by an agency):{' '}
          <strong>country → city → area</strong>. Trips point at a city/country; gems hang
          off an area. Agencies only <em>pick</em> places when creating gems or trips; the
          catalog is managed by platform superadmins.
        </p>
      </div>

      {!canManage ? (
        <p className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
          You can browse the tree below. Only <strong>superadmin</strong> can add or edit
          places.
        </p>
      ) : null}

      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button
              type="button"
              className="underline"
              onClick={() => setBrowseParentId(null)}
            >
              Root
            </button>
            {breadcrumb.map((p) => (
              <span key={p.id} className="flex items-center gap-2">
                <span>/</span>
                <button
                  type="button"
                  className="underline"
                  onClick={() => setBrowseParentId(p.id)}
                >
                  {p.name}
                </button>
              </span>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            <ListControls
              search={placeList.search}
              onSearchChange={placeList.setSearch}
              placeholder="Filter places…"
              page={placeList.page}
              pageCount={placeList.pageCount}
              pageSize={placeList.pageSize}
              onPageChange={placeList.setPage}
              onPageSizeChange={placeList.setPageSize}
              from={placeList.from}
              to={placeList.to}
              total={placeList.total}
              filters={
                <select
                  className="h-10 rounded-xl border border-border bg-background px-3 text-sm capitalize"
                  value={kindFilter}
                  onChange={(e) => {
                    setKindFilter(e.target.value as typeof kindFilter);
                    placeList.setPage(1);
                  }}
                >
                  {allowedKinds.length > 1 ? <option value="all">All here</option> : null}
                  {allowedKinds.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              }
            />
            <ul className="space-y-1">
              {placeList.pageItems.map((p) => {
                const hasKids = places.some((c) => c.parentId === p.id);
                return (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm"
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setBrowseParentId(p.id)}
                    >
                      <span className="font-medium">{p.name}</span>
                      <span className="ml-2 text-xs capitalize text-muted-foreground">
                        {p.kind}
                        {hasKids ? ' · has children' : ''}
                      </span>
                    </button>
                    {canManage ? (
                      <span className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          className="text-xs underline"
                          onClick={() => void rename(p)}
                        >
                          Rename
                        </button>
                        <button
                          type="button"
                          className="text-xs text-red-700 underline"
                          onClick={() => void remove(p)}
                        >
                          Delete
                        </button>
                      </span>
                    ) : null}
                  </li>
                );
              })}
              {!placeList.total ? (
                <li className="text-sm text-muted-foreground">No places match.</li>
              ) : null}
            </ul>
          </div>
        </section>

        {canManage ? (
          <form
            onSubmit={onCreate}
            className="space-y-3 rounded-2xl border border-border bg-card p-4"
          >
            <h2 className="font-display text-lg font-semibold">
              Add place
              {parent ? ` under ${parent.name}` : ' (country at root)'}
            </h2>
            <label className="block text-sm">
              Name
              <input
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm">
              Kind
              <select
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 capitalize"
                value={kind}
                onChange={(e) => setKind(e.target.value as PlaceKind)}
              >
                {allowedKinds.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-sm">
                Lat (optional)
                <input
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="48.8566"
                />
              </label>
              <label className="block text-sm">
                Lng (optional)
                <input
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  placeholder="2.3522"
                />
              </label>
            </div>
            <button
              type="submit"
              className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              Create
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
