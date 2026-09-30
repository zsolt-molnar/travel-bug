'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import { AttachmentViewButton } from '@/components/attachment-viewer';
import type { DocCategory, TimelineItem, Trip, VaultDocument } from '@/lib/types';

type ItineraryDay = {
  id: string;
  dayNumber: number;
  date: string;
  theme?: string | null;
  placeId?: string | null;
  items: TimelineItem[];
};

type ItineraryResponse = {
  tripId: string;
  itineraryId?: string;
  title?: string;
  status?: string;
  days: ItineraryDay[];
};

type ApiDoc = {
  id: string;
  userId: string;
  tripId: string;
  docType: string;
  title: string | null;
  fileUrl: string;
};

type TripGem = {
  id: string;
  title: string;
  category: string;
  description: string;
  neighborhood: string | null;
};

type Place = {
  id: string;
  name: string;
  kind: string;
  parentId: string | null;
};

const ITEM_TYPES = [
  'activity',
  'eat',
  'drink',
  'transit',
  'hidden_gem',
  'other',
] as const;

/** Destination place + descendants (areas under the city, etc.). */
function placeOptionsForTrip(places: Place[], destinationPlaceId?: string | null) {
  if (!destinationPlaceId) {
    return places
      .filter((p) => p.kind === 'city' || p.kind === 'area')
      .map((p) => ({ id: p.id, label: p.name }));
  }
  const byParent = new Map<string | null, Place[]>();
  for (const p of places) {
    const key = p.parentId ?? null;
    const list = byParent.get(key) ?? [];
    list.push(p);
    byParent.set(key, list);
  }
  const ids = new Set<string>();
  const stack = [destinationPlaceId];
  while (stack.length) {
    const id = stack.pop()!;
    ids.add(id);
    for (const child of byParent.get(id) ?? []) stack.push(child.id);
  }
  const byId = new Map(places.map((p) => [p.id, p]));
  return [...ids]
    .map((id) => byId.get(id))
    .filter((p): p is Place => Boolean(p))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => ({
      id: p.id,
      label: p.id === destinationPlaceId ? `${p.name} (whole destination)` : p.name,
    }));
}

export default function TripDetailClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tripId = searchParams.get('tripId')?.trim() ?? '';
  const dayIdParam = searchParams.get('dayId')?.trim() ?? '';
  const panel = searchParams.get('panel')?.trim() ?? '';
  const showBoard = panel === 'board';

  const {
    data: trips,
    error: tripsError,
    mutate: mutateTrips,
  } = useSWR('trips', () => apiGet<Trip[]>('/trips'));
  const {
    data: itinerary,
    error: itineraryError,
    isLoading,
    mutate,
  } = useSWR(tripId ? `itinerary:${tripId}` : null, () =>
    apiGet<ItineraryResponse>(`/itinerary/${tripId}`),
  );
  const { data: places = [] } = useSWR('places', () => apiGet<Place[]>('/places'));
  const { data: vaultDocs, mutate: mutateVault } = useSWR('vault', async () => {
    const rows = await apiGet<ApiDoc[]>('/vault/documents');
    return rows.map((d): VaultDocument => ({
      id: d.id,
      userId: d.userId,
      tripId: d.tripId,
      docType: d.docType as DocCategory,
      title: d.title ?? 'Document',
      fileUrl: d.fileUrl,
    }));
  });

  const trip = trips?.find((t) => t.id === tripId);
  /** Agency trips (operatorId set) are read-only — copy to edit. */
  const canEdit = Boolean(trip && !trip.operatorId);
  const days = itinerary?.days ?? [];

  const { data: boardMessages = [] } = useSWR(
    tripId && trip?.operatorId ? `trip-messages:${tripId}` : null,
    () =>
      apiGet<
        Array<{
          id: string;
          kind: string;
          title: string;
          body: string;
          createdAt: string;
        }>
      >(`/trips/${tripId}/messages`),
  );

  useEffect(() => {
    if (!showBoard) return;
    const el = document.getElementById('message-board');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [showBoard, boardMessages.length]);

  const [activeDayId, setActiveDayId] = useState<string | null>(dayIdParam || null);
  const [attachFor, setAttachFor] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showAddDay, setShowAddDay] = useState(false);
  const [newDayTheme, setNewDayTheme] = useState('');
  const [dayThemeDraft, setDayThemeDraft] = useState('');
  const [dayDateDraft, setDayDateDraft] = useState('');
  const [dayPlaceDraft, setDayPlaceDraft] = useState('');
  const [manualOpen, setManualOpen] = useState(false);
  const [gemOpen, setGemOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualType, setManualType] = useState('activity');
  const [manualSlot, setManualSlot] = useState('');
  const [manualLocation, setManualLocation] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [gemPick, setGemPick] = useState('');
  const [gemSlot, setGemSlot] = useState('');
  const [tripTitleDraft, setTripTitleDraft] = useState('');
  const [tripStartDraft, setTripStartDraft] = useState('');
  const [tripEndDraft, setTripEndDraft] = useState('');
  const [itinTitleDraft, setItinTitleDraft] = useState('');
  const [itinStatusDraft, setItinStatusDraft] = useState('active');
  const [metaMsg, setMetaMsg] = useState('');

  const activeDay = useMemo(() => {
    if (!days.length) return null;
    const id = activeDayId ?? days[0]?.id;
    return days.find((d) => d.id === id) ?? days[0] ?? null;
  }, [days, activeDayId]);

  useEffect(() => {
    if (!dayIdParam || !days.length) return;
    if (days.some((d) => d.id === dayIdParam)) {
      setActiveDayId(dayIdParam);
    }
  }, [dayIdParam, days]);

  const { data: tripGems = [] } = useSWR(
    tripId && activeDay
      ? `trip-gems:${tripId}:${activeDay.id}:${activeDay.placeId ?? 'dest'}`
      : tripId
        ? `trip-gems:${tripId}`
        : null,
    () =>
      apiGet<TripGem[]>(
        activeDay
          ? `/trips/${tripId}/gems?dayId=${activeDay.id}`
          : `/trips/${tripId}/gems`,
      ),
  );

  const dayPlaceOptions = useMemo(
    () => placeOptionsForTrip(places, trip?.destinationPlaceId),
    [places, trip?.destinationPlaceId],
  );

  useEffect(() => {
    if (!activeDay) return;
    setDayThemeDraft(activeDay.theme ?? '');
    setDayDateDraft(activeDay.date);
    setDayPlaceDraft(activeDay.placeId ?? trip?.destinationPlaceId ?? '');
  }, [activeDay, trip?.destinationPlaceId]);

  useEffect(() => {
    if (!trip) return;
    setTripTitleDraft(trip.title || trip.destination);
    setTripStartDraft(trip.startDate);
    setTripEndDraft(trip.endDate);
  }, [trip?.id, trip?.title, trip?.destination, trip?.startDate, trip?.endDate]);

  useEffect(() => {
    if (!itinerary?.itineraryId) return;
    setItinTitleDraft(itinerary.title ?? '');
    setItinStatusDraft(itinerary.status ?? 'active');
  }, [itinerary?.itineraryId, itinerary?.title, itinerary?.status]);

  const tripDocs = useMemo(
    () => (vaultDocs ?? []).filter((d) => d.tripId === tripId),
    [vaultDocs, tripId],
  );

  const usedGemIds = useMemo(() => {
    const ids = new Set<string>();
    for (const day of days) {
      for (const item of day.items) {
        if (item.gemId) ids.add(item.gemId);
      }
    }
    return ids;
  }, [days]);

  const availableGems = tripGems.filter((g) => !usedGemIds.has(g.id));

  async function bootstrapItinerary() {
    if (!canEdit) return;
    setActionError('');
    setBusy(true);
    try {
      await apiPost('/itinerary', { tripId, createFirstDay: true });
      await mutate();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not create itinerary.');
    } finally {
      setBusy(false);
    }
  }

  async function copyAgencyTrip() {
    setActionError('');
    setBusy(true);
    try {
      const copied = await apiPost<{
        id: string;
        documentsCopied?: number;
      }>(`/trips/${tripId}/copy`, {});
      await Promise.all([mutateTrips(), mutateVault()]);
      router.push(`/app/trips/detail?tripId=${copied.id}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not copy trip.');
      setBusy(false);
    }
  }

  async function saveTripMeta() {
    if (!canEdit) return;
    setMetaMsg('');
    setActionError('');
    if (!tripTitleDraft.trim()) {
      setMetaMsg('Trip title is required');
      return;
    }
    if (!tripStartDraft || !tripEndDraft) {
      setMetaMsg('Start and end dates are required');
      return;
    }
    if (tripEndDraft <= tripStartDraft) {
      setMetaMsg('End date must be after start date');
      return;
    }
    setBusy(true);
    try {
      await apiPatch(`/trips/${tripId}`, {
        title: tripTitleDraft.trim(),
        startDate: tripStartDraft,
        endDate: tripEndDraft,
      });
      if (itinerary?.itineraryId) {
        await apiPatch(`/itinerary/${itinerary.itineraryId}`, {
          title: itinTitleDraft.trim() || undefined,
          status: itinStatusDraft,
        });
      }
      setMetaMsg('Saved');
      await Promise.all([mutateTrips(), mutate()]);
    } catch (err) {
      setMetaMsg(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteTrip() {
    if (!canEdit) return;
    if (
      !confirm(
        'Delete this trip permanently? Its itinerary and vault docs for this trip will be removed.',
      )
    ) {
      return;
    }
    setActionError('');
    setBusy(true);
    try {
      await apiDelete(`/trips/${tripId}`);
      await mutateTrips();
      router.push('/app/trips');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not delete trip.');
      setBusy(false);
    }
  }

  async function addDay(e?: React.FormEvent) {
    e?.preventDefault();
    if (!itinerary?.itineraryId) return;
    setActionError('');
    setBusy(true);
    try {
      const nextNum = days.reduce((max, d) => Math.max(max, d.dayNumber), 0) + 1;
      const base = days[days.length - 1]?.date;
      const date =
        base && !Number.isNaN(Date.parse(base))
          ? new Date(new Date(base).getTime() + 86400000).toISOString().slice(0, 10)
          : (trip?.startDate ?? new Date().toISOString().slice(0, 10));
      const theme = newDayTheme.trim() || `Day ${nextNum}`;
      await apiPost(`/itinerary/${itinerary.itineraryId}/days`, {
        dayNumber: nextNum,
        date,
        theme,
      });
      setNewDayTheme('');
      setShowAddDay(false);
      await mutate();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not add day.');
    } finally {
      setBusy(false);
    }
  }

  async function saveDayMeta() {
    if (!activeDay) return;
    setActionError('');
    setBusy(true);
    try {
      await apiPatch(`/itinerary/days/${activeDay.id}`, {
        theme: dayThemeDraft.trim() || null,
        date: dayDateDraft,
        placeId: dayPlaceDraft || null,
      });
      await mutate();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update day.');
    } finally {
      setBusy(false);
    }
  }

  async function addManualItem(e: React.FormEvent) {
    e.preventDefault();
    if (!activeDay || !manualTitle.trim() || !manualSlot) return;
    setActionError('');
    setBusy(true);
    try {
      await apiPost(`/itinerary/days/${activeDay.id}/items`, {
        itemType: manualType,
        title: manualTitle.trim(),
        description: manualNotes.trim() || undefined,
        timeSlot: manualSlot,
        locationName: manualLocation.trim() || undefined,
        sortOrder: activeDay.items.length,
      });
      setManualTitle('');
      setManualNotes('');
      setManualSlot('');
      setManualLocation('');
      setManualOpen(false);
      await mutate();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not add item.');
    } finally {
      setBusy(false);
    }
  }

  async function addFromGem(e: React.FormEvent) {
    e.preventDefault();
    if (!activeDay || !gemPick || !gemSlot) return;
    setActionError('');
    setBusy(true);
    try {
      await apiPost(`/itinerary/days/${activeDay.id}/items/from-gem`, {
        gemId: gemPick,
        timeSlot: gemSlot,
      });
      setGemPick('');
      setGemSlot('');
      setGemOpen(false);
      await mutate();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not add gem.');
    } finally {
      setBusy(false);
    }
  }

  async function suggestGems() {
    if (!activeDay) return;
    setActionError('');
    setBusy(true);
    try {
      await apiPost(`/itinerary/days/${activeDay.id}/items/suggest-from-gems`, {
        limit: 3,
        apply: true,
      });
      await mutate();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not suggest gems.');
    } finally {
      setBusy(false);
    }
  }

  async function saveItem(
    item: TimelineItem,
    patch: {
      title: string;
      timeSlot: string;
      itemType: string;
      locationName: string;
      description: string;
    },
  ) {
    if (!patch.timeSlot) throw new Error('Time is required');
    await apiPatch(`/itinerary/items/${item.id}`, {
      title: patch.title.trim(),
      timeSlot: patch.timeSlot,
      itemType: patch.itemType,
      locationName: patch.locationName.trim() || null,
      description: patch.description.trim() || null,
    });
    await mutate();
  }

  async function removeItem(itemId: string) {
    if (!confirm('Remove this item?')) return;
    setActionError('');
    try {
      await apiDelete(`/itinerary/items/${itemId}`);
      await mutate();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not remove item.');
    }
  }

  async function attachDoc(itemId: string, documentId: string | null) {
    setActionError('');
    try {
      await apiPatch(`/itinerary/items/${itemId}`, { documentId });
      setAttachFor(null);
      await mutate();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not attach document.');
    }
  }

  if (!tripId) {
    return (
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-semibold">Trip</h1>
        <p className="text-sm text-destructive">Missing trip id.</p>
      </div>
    );
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading itinerary…</p>;
  }

  if (itineraryError || tripsError) {
    return (
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-semibold">Trip</h1>
        <p className="text-sm text-destructive">
          Could not load trip.{' '}
          {itineraryError instanceof Error
            ? itineraryError.message
            : tripsError instanceof Error
              ? tripsError.message
              : ''}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">
          {trip?.title || trip?.destination || 'Trip'}
        </h1>
        {trip ? (
          <p className="text-sm text-muted-foreground">
            {trip.destination} · {trip.startDate} → {trip.endDate}
            {trip.operatorId ? ' · Agency plan' : ' · My trip'}
          </p>
        ) : null}
      </div>

      {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}

      {!canEdit ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm text-muted-foreground">
              This is an agency trip — view only. Copy it to your trips to edit the
              itinerary. Your vault documents stay on the agency trip and are also copied
              onto your version (same files, not moved).
            </p>
            <Button disabled={busy} onClick={() => void copyAgencyTrip()}>
              {busy ? 'Copying…' : 'Copy to my trips'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-medium">Trip & itinerary</p>
            <label className="block text-sm">
              Trip title
              <input
                className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                value={tripTitleDraft}
                onChange={(e) => setTripTitleDraft(e.target.value)}
                placeholder="e.g. Solo Paris Escape"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-sm">
                Start
                <input
                  type="date"
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  value={tripStartDraft}
                  onChange={(e) => {
                    const next = e.target.value;
                    setTripStartDraft(next);
                    if (tripEndDraft && next && tripEndDraft <= next) {
                      const d = new Date(`${next}T12:00:00`);
                      d.setDate(d.getDate() + 1);
                      setTripEndDraft(d.toISOString().slice(0, 10));
                    }
                  }}
                />
              </label>
              <label className="block text-sm">
                End
                <input
                  type="date"
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  value={tripEndDraft}
                  onChange={(e) => setTripEndDraft(e.target.value)}
                />
              </label>
            </div>
            {itinerary?.itineraryId ? (
              <>
                <label className="block text-sm">
                  Itinerary title
                  <input
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                    value={itinTitleDraft}
                    onChange={(e) => setItinTitleDraft(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  Status
                  <select
                    className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm capitalize"
                    value={itinStatusDraft}
                    onChange={(e) => setItinStatusDraft(e.target.value)}
                  >
                    {(['draft', 'active', 'archived'] as const).map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Create an itinerary below to set its title and status.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={busy} onClick={() => void saveTripMeta()}>
                Save details
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                className="text-destructive"
                onClick={() => void deleteTrip()}
              >
                Delete trip
              </Button>
            </div>
            {metaMsg ? <p className="text-sm text-muted-foreground">{metaMsg}</p> : null}
          </CardContent>
        </Card>
      )}

      {trip?.operatorId ? (
        <section
          id="message-board"
          className={`space-y-3 ${showBoard ? 'rounded-2xl ring-2 ring-primary/40 ring-offset-2' : ''}`}
        >
          <div>
            <h2 className="font-display text-lg font-semibold">Message board</h2>
            <p className="text-sm text-muted-foreground">
              Updates from your agency about this trip.
            </p>
          </div>
          {!boardMessages.length ? (
            <Card>
              <CardContent className="p-4 text-sm text-muted-foreground">
                No messages yet.
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-2">
              {boardMessages.map((m) => (
                <li key={m.id}>
                  <Card>
                    <CardContent className="space-y-1.5 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="capitalize">{m.kind}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(m.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="font-medium leading-snug">{m.title}</p>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {m.body}
                      </p>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {!days.length ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm text-muted-foreground">
              {itinerary?.itineraryId
                ? 'No days on this itinerary yet.'
                : 'No itinerary for this trip yet. Create one to plan your days.'}
            </p>
            {canEdit && !itinerary?.itineraryId ? (
              <Button disabled={busy} onClick={() => void bootstrapItinerary()}>
                {busy ? 'Creating…' : 'Create itinerary + Day 1'}
              </Button>
            ) : null}
            {canEdit && itinerary?.itineraryId ? (
              <Button disabled={busy} onClick={() => setShowAddDay(true)}>
                Add day
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {days.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setActiveDayId(d.id)}
                className={`shrink-0 rounded-xl border px-3 py-2 text-left text-sm ${
                  activeDay?.id === d.id
                    ? 'border-primary bg-primary/10 font-medium'
                    : 'border-border bg-card'
                }`}
              >
                Day {d.dayNumber}
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {d.date}
                </span>
              </button>
            ))}
            {canEdit && itinerary?.itineraryId ? (
              <button
                type="button"
                onClick={() => setShowAddDay(true)}
                className="shrink-0 rounded-xl border border-dashed border-border px-3 py-2 text-sm text-muted-foreground"
              >
                + Day
              </button>
            ) : null}
          </div>

          {canEdit && showAddDay ? (
            <form
              onSubmit={(e) => void addDay(e)}
              className="space-y-2 rounded-xl border border-border bg-card p-3"
            >
              <p className="text-xs font-medium">New day theme</p>
              <input
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                placeholder="e.g. Marais welcome"
                value={newDayTheme}
                onChange={(e) => setNewDayTheme(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={busy}>
                  Save day
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowAddDay(false);
                    setNewDayTheme('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : null}

          {activeDay ? (
            <>
              <Card>
                <CardContent className="space-y-3 p-4">
                  <h2 className="font-display text-lg font-semibold">
                    Day {activeDay.dayNumber}
                    {activeDay.theme ? (
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        · {activeDay.theme}
                      </span>
                    ) : null}
                  </h2>
                  {canEdit ? (
                    <>
                      <label className="block text-sm">
                        Theme
                        <input
                          className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                          value={dayThemeDraft}
                          onChange={(e) => setDayThemeDraft(e.target.value)}
                          placeholder="e.g. Marais welcome"
                        />
                      </label>
                      <label className="block text-sm">
                        Date
                        <input
                          type="date"
                          className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                          value={dayDateDraft}
                          onChange={(e) => setDayDateDraft(e.target.value)}
                        />
                      </label>
                      <label className="block text-sm">
                        Area (gems)
                        <select
                          className="mt-1 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                          value={dayPlaceDraft}
                          onChange={(e) => setDayPlaceDraft(e.target.value)}
                        >
                          <option value="">Trip destination (default)</option>
                          {dayPlaceOptions.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Narrows which gems appear when adding/suggesting for this day.
                      </p>
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => void saveDayMeta()}
                      >
                        Save day details
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {activeDay.date}
                      {activeDay.placeId
                        ? ` · ${dayPlaceOptions.find((p) => p.id === activeDay.placeId)?.label ?? 'area set'}`
                        : ''}
                    </p>
                  )}
                </CardContent>
              </Card>

              {canEdit ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setManualOpen((v) => !v);
                      setGemOpen(false);
                    }}
                  >
                    Add item
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setGemOpen((v) => !v);
                      setManualOpen(false);
                    }}
                  >
                    Add gem
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void suggestGems()}
                  >
                    Suggest gems
                  </Button>
                </div>
              ) : null}

              {canEdit && manualOpen ? (
                <form
                  onSubmit={(e) => void addManualItem(e)}
                  className="space-y-2 rounded-xl border border-border bg-card p-4"
                >
                  <p className="text-sm font-medium">Custom item</p>
                  <input
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                    placeholder="Title"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    required
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="h-10 rounded-lg border border-border bg-background px-3 text-sm capitalize"
                      value={manualType}
                      onChange={(e) => setManualType(e.target.value)}
                    >
                      {ITEM_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                    <input
                      className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
                      type="time"
                      value={manualSlot}
                      onChange={(e) => setManualSlot(e.target.value)}
                      required
                    />
                  </div>
                  <input
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                    placeholder="Location (optional)"
                    value={manualLocation}
                    onChange={(e) => setManualLocation(e.target.value)}
                  />
                  <textarea
                    className="min-h-16 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Notes (optional)"
                    value={manualNotes}
                    onChange={(e) => setManualNotes(e.target.value)}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={busy || !manualTitle.trim() || !manualSlot}
                  >
                    Save item
                  </Button>
                </form>
              ) : null}

              {canEdit && gemOpen ? (
                <form
                  onSubmit={(e) => void addFromGem(e)}
                  className="space-y-2 rounded-xl border border-border bg-card p-4"
                >
                  <p className="text-sm font-medium">From gems</p>
                  <select
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                    value={gemPick}
                    onChange={(e) => setGemPick(e.target.value)}
                    required
                  >
                    <option value="">Select a gem…</option>
                    {availableGems.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.title} ({g.category})
                      </option>
                    ))}
                  </select>
                  <input
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                    type="time"
                    value={gemSlot}
                    onChange={(e) => setGemSlot(e.target.value)}
                    required
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={busy || !availableGems.length}
                  >
                    Add gem to day
                  </Button>
                  {!availableGems.length ? (
                    <p className="text-xs text-muted-foreground">
                      No unused gems left for this destination.
                    </p>
                  ) : null}
                </form>
              ) : null}

              <ol className="relative space-y-4 border-l-2 border-primary/40 pl-4">
                {[...activeDay.items]
                  .sort((a, b) => (a.timeSlot ?? '').localeCompare(b.timeSlot ?? ''))
                  .map((item) => (
                    <li key={item.id} className="relative">
                      <span className="absolute -left-[1.4rem] top-1.5 h-3 w-3 rounded-full bg-primary" />
                      <ItineraryItemCard
                        item={item}
                        doc={tripDocs.find((d) => d.id === item.documentId)}
                        tripDocs={tripDocs}
                        readOnly={!canEdit}
                        canAttach
                        attachOpen={attachFor === item.id}
                        onToggleAttach={() =>
                          setAttachFor(attachFor === item.id ? null : item.id)
                        }
                        onAttach={(documentId) => void attachDoc(item.id, documentId)}
                        onDetach={() => void attachDoc(item.id, null)}
                        onSave={saveItem}
                        onRemove={removeItem}
                      />
                    </li>
                  ))}
                {!activeDay.items.length ? (
                  <li className="text-sm text-muted-foreground">No items yet.</li>
                ) : null}
              </ol>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ItineraryItemCard({
  item,
  doc,
  tripDocs,
  readOnly,
  canAttach,
  attachOpen,
  onToggleAttach,
  onAttach,
  onDetach,
  onSave,
  onRemove,
}: {
  item: TimelineItem;
  doc?: VaultDocument;
  tripDocs: VaultDocument[];
  readOnly?: boolean;
  canAttach?: boolean;
  attachOpen: boolean;
  onToggleAttach: () => void;
  onAttach: (documentId: string) => void;
  onDetach: () => void;
  onSave: (
    item: TimelineItem,
    patch: {
      title: string;
      timeSlot: string;
      itemType: string;
      locationName: string;
      description: string;
    },
  ) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [slot, setSlot] = useState(item.timeSlot ?? '');
  const [itemType, setItemType] = useState(String(item.itemType));
  const [location, setLocation] = useState(item.locationName ?? '');
  const [notes, setNotes] = useState(item.description ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(item.title);
    setSlot(item.timeSlot ?? '');
    setItemType(String(item.itemType));
    setLocation(item.locationName ?? '');
    setNotes(item.description ?? '');
  }, [
    item.id,
    item.title,
    item.timeSlot,
    item.itemType,
    item.locationName,
    item.description,
  ]);

  async function save() {
    if (!slot || !title.trim()) return;
    setSaving(true);
    try {
      await onSave(item, {
        title,
        timeSlot: slot,
        itemType,
        locationName: location,
        description: notes,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        {!readOnly && editing ? (
          <>
            <input
              className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                className="h-9 rounded-lg border border-border bg-background px-2 text-sm"
                type="time"
                value={slot}
                onChange={(e) => setSlot(e.target.value)}
                required
              />
              <select
                className="h-9 rounded-lg border border-border bg-background px-2 text-sm capitalize"
                value={itemType}
                onChange={(e) => setItemType(e.target.value)}
              >
                {ITEM_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
            <input
              className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location"
            />
            <textarea
              className="min-h-16 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes"
            />
            <div className="flex flex-wrap gap-3 text-xs">
              <button
                type="button"
                disabled={saving || !slot || !title.trim()}
                className="text-primary underline disabled:opacity-40"
                onClick={() => void save()}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                className="text-muted-foreground underline"
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">{item.timeSlot}</span>
              <Badge className="capitalize">
                {String(item.itemType).replace('_', ' ')}
              </Badge>
            </div>
            <p className="font-medium">{item.title}</p>
            {item.locationName ? (
              <p className="text-sm text-muted-foreground">{item.locationName}</p>
            ) : null}
            {item.description ? (
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {item.description}
              </p>
            ) : null}
            {doc ? (
              <div className="flex flex-wrap items-center gap-2">
                <AttachmentViewButton
                  attachment={{
                    title: doc.title,
                    fileUrl: doc.fileUrl,
                    docType: doc.docType,
                  }}
                  className="inline-flex h-9 items-center rounded-lg border border-border bg-secondary px-3 text-sm"
                >
                  Show Ticket / Pass · {doc.title}
                </AttachmentViewButton>
                {canAttach ? (
                  <>
                    <Button variant="outline" size="sm" onClick={onToggleAttach}>
                      Change
                    </Button>
                    <button
                      type="button"
                      className="text-xs text-muted-foreground underline"
                      onClick={onDetach}
                    >
                      Detach
                    </button>
                  </>
                ) : null}
              </div>
            ) : canAttach ? (
              <Button variant="outline" size="sm" onClick={onToggleAttach}>
                Attach from Vault
              </Button>
            ) : null}
            {canAttach && attachOpen ? (
              <div className="space-y-2 rounded-xl bg-muted p-2">
                {tripDocs.length === 0 ? (
                  <p className="px-2 py-2 text-sm text-muted-foreground">
                    No vault documents for this trip. Upload one in Vault first.
                  </p>
                ) : (
                  tripDocs.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      className="block w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-card"
                      onClick={() => onAttach(d.id)}
                    >
                      <span className="font-medium">{d.title}</span>
                      <span className="ml-2 text-xs capitalize text-muted-foreground">
                        {d.docType.replace(/_/g, ' ')}
                      </span>
                    </button>
                  ))
                )}
              </div>
            ) : null}
            {!readOnly ? (
              <div className="flex flex-wrap gap-3 text-xs">
                <button
                  type="button"
                  className="text-primary underline"
                  onClick={() => setEditing(true)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="text-destructive underline"
                  onClick={() => void onRemove(item.id)}
                >
                  Remove
                </button>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
