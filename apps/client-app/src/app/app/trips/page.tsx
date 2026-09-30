'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiDelete, apiGet, apiPost } from '@/lib/api';
import type { Trip } from '@/lib/types';

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

export default function TripsPage() {
  const { data, error, isLoading, mutate } = useSWR('trips', () =>
    apiGet<Trip[]>('/trips'),
  );
  const { data: places = [] } = useSWR('places', () => apiGet<Place[]>('/places'));
  const trips = data ?? [];

  const [query, setQuery] = useState('');
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [destinationPlaceId, setDestinationPlaceId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [listError, setListError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
      await apiPost('/trips', {
        title: title.trim() || undefined,
        destination,
        destinationPlaceId,
        startDate,
        endDate,
      });
      await mutate();
      setTitle('');
      setQuery('');
      setDestination('');
      setDestinationPlaceId(null);
      setStartDate('');
      setEndDate('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create trip.');
    }
  }

  async function onDelete(trip: Trip) {
    if (trip.operatorId) return;
    if (!confirm(`Delete “${trip.title || trip.destination}”? This cannot be undone.`)) {
      return;
    }
    setListError('');
    setDeletingId(trip.id);
    try {
      await apiDelete(`/trips/${trip.id}`);
      await mutate();
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Could not delete trip.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Trips</h1>
        <p className="text-sm text-muted-foreground">
          Create and open day-by-day timelines. Agency plans are view-only until you copy
          them.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New trip</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onCreate}>
            <div className="space-y-2">
              <Label htmlFor="title">Title (optional)</Label>
              <Input
                id="title"
                value={title}
                placeholder="e.g. Solo Paris Escape"
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="relative space-y-2">
              <Label htmlFor="dest">Destination</Label>
              <Input
                id="dest"
                value={query}
                autoComplete="off"
                placeholder="Search cities…"
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
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="start">Start</Label>
                <Input
                  id="start"
                  type="date"
                  min={minStart}
                  value={startDate}
                  onChange={(e) => onStartChange(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end">End</Label>
                <Input
                  id="end"
                  type="date"
                  min={minEnd}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>
            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
            <Button type="submit" className="w-full">
              Create trip
            </Button>
          </form>
        </CardContent>
      </Card>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading trips…</p> : null}
      {error ? (
        <p className="text-sm text-destructive">
          Could not load trips. {error instanceof Error ? error.message : ''}
        </p>
      ) : null}
      {listError ? <p className="text-sm text-destructive">{listError}</p> : null}
      {!isLoading && !error && trips.length === 0 ? (
        <p className="text-sm text-muted-foreground">No trips yet.</p>
      ) : null}

      <div className="space-y-3">
        {trips.map((trip) => {
          const personal = !trip.operatorId;
          return (
            <Card key={trip.id} className="transition hover:border-primary">
              <CardContent className="flex items-start gap-3 p-4">
                <Link
                  href={`/app/trips/detail?tripId=${trip.id}`}
                  className="min-w-0 flex-1"
                >
                  <p className="font-medium">{trip.title || trip.destination}</p>
                  <p className="text-sm text-muted-foreground">
                    {trip.destination} · {trip.startDate} → {trip.endDate}
                  </p>
                  <div className="mt-2">
                    <Badge
                      className={
                        personal
                          ? undefined
                          : 'border-border bg-background text-muted-foreground'
                      }
                    >
                      {personal ? 'My trip' : 'Agency'}
                    </Badge>
                  </div>
                </Link>
                {personal ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0 text-destructive"
                    disabled={deletingId === trip.id}
                    onClick={() => void onDelete(trip)}
                  >
                    {deletingId === trip.id ? '…' : 'Delete'}
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
