'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { ListControls } from '@/components/list-controls';
import { adminGet, adminPost, getAdminRole } from '@/lib/admin-api';
import { pageFetcher, useServerList, type PageResult } from '@/lib/use-list-query';

type Trip = {
  id: string;
  title?: string;
  destination: string;
  startDate: string;
  endDate: string;
  operatorId?: string | null;
};

type Place = {
  id: string;
  name: string;
  kind: string;
  parentId: string | null;
};

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDaysIso(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function TripsAdminPage() {
  const role = getAdminRole();
  const list = useServerList<Trip>(
    'agency-trips',
    pageFetcher(adminGet, '/agencies/trips'),
  );
  const { data: places = [] } = useSWR('places', () => adminGet<Place[]>('/places'));

  const [title, setTitle] = useState('');
  const [query, setQuery] = useState('');
  const [destination, setDestination] = useState('');
  const [destinationPlaceId, setDestinationPlaceId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const minStart = todayIso();
  const minEnd = startDate ? addDaysIso(startDate, 1) : addDaysIso(minStart, 1);

  const byId = useMemo(() => {
    const map = new Map<string, Place>();
    for (const p of places) map.set(p.id, p);
    return map;
  }, [places]);

  const cityOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return places
      .filter((p) => p.kind === 'city')
      .map((p) => {
        const parent = p.parentId ? byId.get(p.parentId) : undefined;
        const label = parent ? `${p.name} · ${parent.name}` : p.name;
        return { ...p, label };
      })
      .filter((p) => !q || p.label.toLowerCase().includes(q))
      .slice(0, 12);
  }, [places, byId, query]);

  function selectPlace(place: Place & { label: string }) {
    setDestination(place.name);
    setDestinationPlaceId(place.id);
    setQuery(place.label);
    setOpen(false);
  }

  function onStartChange(value: string) {
    setStartDate(value);
    if (endDate && value && endDate <= value) {
      setEndDate(addDaysIso(value, 1));
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!destinationPlaceId || !destination) {
      setFormError('Pick a destination from the places list.');
      return;
    }
    if (!startDate || !endDate) {
      setFormError('Start and end dates are required.');
      return;
    }
    if (startDate < minStart) {
      setFormError('Start date cannot be in the past.');
      return;
    }
    if (endDate <= startDate) {
      setFormError('End date must be after start date.');
      return;
    }
    try {
      await adminPost('/agencies/trips', {
        title: title.trim() || undefined,
        destination,
        destinationPlaceId,
        startDate,
        endDate,
      });
      setTitle('');
      setQuery('');
      setDestination('');
      setDestinationPlaceId(null);
      setStartDate('');
      setEndDate('');
      await list.mutate();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create trip.');
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Trips</h1>
        <p className="text-muted-foreground">
          {role === 'superadmin'
            ? 'All trips — agency and independent (B2C). Open a trip to see travelers.'
            : 'Trips for your agency only.'}
        </p>
      </div>

      <form
        onSubmit={onCreate}
        className="grid max-w-2xl gap-3 rounded-2xl border border-border bg-card p-6 md:grid-cols-4"
      >
        <input
          className="h-11 w-full rounded-xl border border-border px-3 md:col-span-4"
          placeholder="Trip title (e.g. Wanderlust Paris VIP)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="relative md:col-span-2">
          <input
            className="h-11 w-full rounded-xl border border-border px-3"
            placeholder="Destination"
            value={query}
            autoComplete="off"
            onFocus={() => {
              if (blurTimer.current) clearTimeout(blurTimer.current);
              setOpen(true);
            }}
            onBlur={() => {
              blurTimer.current = setTimeout(() => setOpen(false), 150);
            }}
            onChange={(e) => {
              setQuery(e.target.value);
              setDestination('');
              setDestinationPlaceId(null);
              setOpen(true);
            }}
          />
          {open && cityOptions.length > 0 ? (
            <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-border bg-card py-1 shadow-md">
              {cityOptions.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectPlace(p)}
                  >
                    {p.label}
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {p.kind}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {open && query.trim() && cityOptions.length === 0 ? (
            <div className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-muted-foreground shadow-md">
              No matching cities in places.
            </div>
          ) : null}
        </div>
        <input
          className="h-11 rounded-xl border border-border px-3"
          type="date"
          min={minStart}
          value={startDate}
          onChange={(e) => onStartChange(e.target.value)}
          required
        />
        <input
          className="h-11 rounded-xl border border-border px-3"
          type="date"
          min={minEnd}
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          required
        />
        {formError ? (
          <p className="text-sm text-destructive md:col-span-4">{formError}</p>
        ) : null}
        <button
          type="submit"
          className="h-11 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground md:col-span-4"
        >
          Create trip
        </button>
      </form>

      <div className="space-y-3">
        <ListControls
          search={list.search}
          onSearchChange={list.setSearch}
          placeholder="Filter trips…"
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
                <th className="px-4 py-3">Trip</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3">Scope</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {list.pageItems.map((t) => (
                <tr key={t.id} className="border-b border-border">
                  <td className="px-4 py-3 font-medium">{t.title || t.destination}</td>
                  <td className="px-4 py-3 text-muted-foreground">{t.destination}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {t.operatorId ? 'Agency' : 'Independent'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {t.startDate} → {t.endDate}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/trips/${t.id}`} className="text-primary underline">
                      Open trip
                    </Link>
                  </td>
                </tr>
              ))}
              {!list.isLoading && !list.total ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                    No trips match.
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
