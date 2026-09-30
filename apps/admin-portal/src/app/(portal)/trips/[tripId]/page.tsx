'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { ListControls } from '@/components/list-controls';
import { adminDelete, adminGet, adminPatch, adminPost } from '@/lib/admin-api';
import { useServerList, type PageResult } from '@/lib/use-list-query';

const CLIENT_APP = process.env.NEXT_PUBLIC_CLIENT_APP_URL ?? 'http://localhost:3000';

type ItineraryItem = {
  id: string;
  timeSlot: string | null;
  itemType: string;
  title: string;
  description: string | null;
  locationName: string | null;
  gemId: string | null;
  sortOrder: number | null;
};

type ItineraryDay = {
  id: string;
  dayNumber: number;
  date: string;
  theme: string | null;
  placeId: string | null;
  items: ItineraryItem[];
};

type ItineraryPayload = {
  tripId: string;
  itineraryId?: string;
  title?: string;
  status?: string;
  days: ItineraryDay[];
};

type TripGem = {
  id: string;
  title: string;
  category: string;
  description: string;
  neighborhood: string | null;
};

type TripTraveler = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  isOwner?: boolean;
  docCount?: number;
};

type TripClientsPage = PageResult<TripTraveler> & {
  pending: Array<{
    id: string;
    email: string;
    code: string;
    status: string;
  }>;
  ownerId?: string;
  independent?: boolean;
};

type TripRow = {
  id: string;
  title: string;
  destination: string;
  destinationPlaceId?: string | null;
  startDate: string;
  endDate: string;
};

type Place = {
  id: string;
  name: string;
  kind: string;
  parentId: string | null;
};

const ITINERARY_STATUSES = ['draft', 'active', 'archived'] as const;

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

export default function TripDetailPage() {
  const params = useParams();
  const tripId = String(params.tripId);
  const travelers = useServerList<TripTraveler>(`trip-clients:${tripId}`, (query) =>
    adminGet<TripClientsPage>(`/agencies/trips/${tripId}/clients${query}`),
  );
  const clientsMeta = travelers.data as TripClientsPage | undefined;
  const { data: trip, mutate: mutateTrip } = useSWR(`trip:${tripId}`, () =>
    adminGet<TripRow>(`/agencies/trips/${tripId}`),
  );
  const {
    data: itinerary,
    mutate: mutateItinerary,
    error: itineraryError,
  } = useSWR(`itinerary:${tripId}`, () =>
    adminGet<ItineraryPayload>(`/itinerary/${tripId}`),
  );
  const { data: places = [] } = useSWR('places', () => adminGet<Place[]>('/places'));

  const [email, setEmail] = useState('');
  const [lastInvite, setLastInvite] = useState<string | null>(null);
  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  const [gemPick, setGemPick] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualType, setManualType] = useState('activity');
  const [manualSlot, setManualSlot] = useState('');
  const [manualLocation, setManualLocation] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [dayThemeDraft, setDayThemeDraft] = useState('');
  const [dayDateDraft, setDayDateDraft] = useState('');
  const [dayPlaceDraft, setDayPlaceDraft] = useState('');
  const [newDayTheme, setNewDayTheme] = useState('');
  const [showAddDay, setShowAddDay] = useState(false);
  const [itinMsg, setItinMsg] = useState('');
  const [tripTitleDraft, setTripTitleDraft] = useState('');
  const [tripStartDraft, setTripStartDraft] = useState('');
  const [tripEndDraft, setTripEndDraft] = useState('');
  const [itinTitleDraft, setItinTitleDraft] = useState('');
  const [itinStatusDraft, setItinStatusDraft] = useState('active');
  const [metaMsg, setMetaMsg] = useState('');
  const [msgKind, setMsgKind] = useState<'alert' | 'info' | 'notice'>('info');
  const [msgTitle, setMsgTitle] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [msgStatus, setMsgStatus] = useState('');

  const { data: boardMessages = [], mutate: mutateMessages } = useSWR(
    `trip-messages:${tripId}`,
    () =>
      adminGet<
        Array<{
          id: string;
          kind: string;
          title: string;
          body: string;
          createdAt: string;
          authorUserId: string;
        }>
      >(`/trips/${tripId}/messages`),
  );

  const days = itinerary?.days ?? [];
  const activeDay = useMemo(() => {
    if (!days.length) return null;
    const id = activeDayId ?? days[0]?.id;
    return days.find((d) => d.id === id) ?? days[0] ?? null;
  }, [days, activeDayId]);

  const { data: tripGems = [] } = useSWR(
    activeDay
      ? `trip-gems:${tripId}:${activeDay.id}:${activeDay.placeId ?? 'dest'}`
      : `trip-gems:${tripId}`,
    () =>
      adminGet<TripGem[]>(
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
  }, [trip]);

  useEffect(() => {
    if (!itinerary) return;
    setItinTitleDraft(itinerary.title ?? '');
    setItinStatusDraft(itinerary.status ?? 'active');
  }, [itinerary?.itineraryId, itinerary?.title, itinerary?.status]);

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

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    const res = await adminPost<{
      status: string;
      invite?: { code: string };
      inviteLink?: string;
    }>(`/agencies/trips/${tripId}/clients`, { email });
    if (res.inviteLink) {
      setLastInvite(`${CLIENT_APP}${res.inviteLink}`);
    } else {
      setLastInvite(null);
    }
    setEmail('');
    await travelers.mutate();
  }

  async function addFromGem(e: React.FormEvent) {
    e.preventDefault();
    if (!activeDay || !gemPick || !timeSlot) return;
    setItinMsg('');
    try {
      await adminPost(`/itinerary/days/${activeDay.id}/items/from-gem`, {
        gemId: gemPick,
        timeSlot,
      });
      setGemPick('');
      setTimeSlot('');
      setItinMsg('Gem added to day');
      await mutateItinerary();
    } catch (err) {
      setItinMsg(err instanceof Error ? err.message : 'Failed to add gem');
    }
  }

  async function addManualItem(e: React.FormEvent) {
    e.preventDefault();
    if (!activeDay || !manualTitle.trim() || !manualSlot) return;
    setItinMsg('');
    try {
      await adminPost(`/itinerary/days/${activeDay.id}/items`, {
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
      setItinMsg('Custom item added');
      await mutateItinerary();
    } catch (err) {
      setItinMsg(err instanceof Error ? err.message : 'Failed to add item');
    }
  }

  async function saveItem(
    item: ItineraryItem,
    patch: {
      title: string;
      timeSlot: string;
      itemType: string;
      locationName: string;
      description: string;
    },
  ) {
    if (!patch.timeSlot) throw new Error('Time is required');
    await adminPatch(`/itinerary/items/${item.id}`, {
      title: patch.title.trim(),
      timeSlot: patch.timeSlot,
      itemType: patch.itemType,
      locationName: patch.locationName.trim() || null,
      description: patch.description.trim() || null,
    });
    await mutateItinerary();
  }

  async function removeItem(itemId: string) {
    if (!confirm('Remove this itinerary item?')) return;
    await adminDelete(`/itinerary/items/${itemId}`);
    await mutateItinerary();
  }

  async function bootstrapItinerary() {
    setItinMsg('');
    try {
      await adminPost('/itinerary', {
        tripId,
        createFirstDay: true,
      });
      setItinMsg('Itinerary created');
      await mutateItinerary();
    } catch (err) {
      setItinMsg(err instanceof Error ? err.message : 'Failed to create itinerary');
    }
  }

  async function addDay(e?: React.FormEvent) {
    e?.preventDefault();
    if (!itinerary?.itineraryId) return;
    setItinMsg('');
    try {
      const nextNum = days.reduce((max, d) => Math.max(max, d.dayNumber), 0) + 1;
      const base = days[days.length - 1]?.date;
      const date =
        base && !Number.isNaN(Date.parse(base))
          ? new Date(new Date(base).getTime() + 86400000).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10);
      const theme = newDayTheme.trim() || `Day ${nextNum}`;
      await adminPost(`/itinerary/${itinerary.itineraryId}/days`, {
        dayNumber: nextNum,
        date,
        theme,
      });
      setNewDayTheme('');
      setShowAddDay(false);
      setItinMsg(`Day ${nextNum} added`);
      await mutateItinerary();
    } catch (err) {
      setItinMsg(err instanceof Error ? err.message : 'Failed to add day');
    }
  }

  async function saveDayMeta() {
    if (!activeDay) return;
    setItinMsg('');
    try {
      await adminPatch(`/itinerary/days/${activeDay.id}`, {
        theme: dayThemeDraft.trim() || null,
        date: dayDateDraft,
        placeId: dayPlaceDraft || null,
      });
      setItinMsg('Day updated');
      await mutateItinerary();
    } catch (err) {
      setItinMsg(err instanceof Error ? err.message : 'Failed to update day');
    }
  }

  async function saveTripMeta() {
    setMetaMsg('');
    try {
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
      await adminPatch(`/agencies/trips/${tripId}`, {
        title: tripTitleDraft.trim(),
        startDate: tripStartDraft,
        endDate: tripEndDraft,
      });
      if (itinerary?.itineraryId) {
        await adminPatch(`/itinerary/${itinerary.itineraryId}`, {
          title: itinTitleDraft.trim() || undefined,
          status: itinStatusDraft,
        });
      }
      setMetaMsg('Saved');
      await Promise.all([mutateTrip(), mutateItinerary()]);
    } catch (err) {
      setMetaMsg(err instanceof Error ? err.message : 'Failed to save');
    }
  }

  async function onPostMessage(e: React.FormEvent) {
    e.preventDefault();
    setMsgStatus('');
    try {
      if (!msgTitle.trim() || !msgBody.trim()) {
        setMsgStatus('Title and body are required');
        return;
      }
      await adminPost(`/trips/${tripId}/messages`, {
        kind: msgKind,
        title: msgTitle.trim(),
        body: msgBody.trim(),
      });
      setMsgTitle('');
      setMsgBody('');
      setMsgKind('info');
      setMsgStatus('Posted — travelers will see it in Notifications');
      await mutateMessages();
    } catch (err) {
      setMsgStatus(err instanceof Error ? err.message : 'Failed to post');
    }
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-3xl font-semibold">
          {trip?.title || trip?.destination || 'Trip detail'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {trip ? `${trip.destination} · ${trip.startDate} → ${trip.endDate}` : null}
        </p>
        <p className="font-mono text-xs text-muted-foreground">{tripId}</p>
      </div>

      <section className="max-w-xl space-y-3 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-semibold">Title, dates & status</h2>
        <label className="block text-sm">
          Trip title
          <input
            className="mt-1 h-10 w-full rounded-xl border border-border px-3 text-sm"
            value={tripTitleDraft}
            onChange={(e) => setTripTitleDraft(e.target.value)}
            placeholder="e.g. Wanderlust Paris VIP"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            Start date
            <input
              type="date"
              className="mt-1 h-10 w-full rounded-xl border border-border px-3 text-sm"
              value={tripStartDraft}
              onChange={(e) => {
                const next = e.target.value;
                setTripStartDraft(next);
                if (tripEndDraft && next && tripEndDraft <= next) {
                  const d = new Date(`${next}T12:00:00`);
                  d.setDate(d.getDate() + 1);
                  const y = d.getFullYear();
                  const m = String(d.getMonth() + 1).padStart(2, '0');
                  const day = String(d.getDate()).padStart(2, '0');
                  setTripEndDraft(`${y}-${m}-${day}`);
                }
              }}
            />
          </label>
          <label className="block text-sm">
            End date
            <input
              type="date"
              className="mt-1 h-10 w-full rounded-xl border border-border px-3 text-sm"
              min={
                tripStartDraft
                  ? (() => {
                      const d = new Date(`${tripStartDraft}T12:00:00`);
                      d.setDate(d.getDate() + 1);
                      const y = d.getFullYear();
                      const m = String(d.getMonth() + 1).padStart(2, '0');
                      const day = String(d.getDate()).padStart(2, '0');
                      return `${y}-${m}-${day}`;
                    })()
                  : undefined
              }
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
                className="mt-1 h-10 w-full rounded-xl border border-border px-3 text-sm"
                value={itinTitleDraft}
                onChange={(e) => setItinTitleDraft(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              Itinerary status
              <select
                className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm capitalize"
                value={itinStatusDraft}
                onChange={(e) => setItinStatusDraft(e.target.value)}
              >
                {ITINERARY_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Create an itinerary to set its title and status.
          </p>
        )}
        <button
          type="button"
          onClick={() => void saveTripMeta()}
          className="h-10 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Save title, dates & status
        </button>
        {metaMsg ? <p className="text-sm text-muted-foreground">{metaMsg}</p> : null}
      </section>

      <section className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-semibold">Itinerary</h2>
          <p className="text-sm text-muted-foreground">
            Edit days and items: custom activities or catalog gems.
          </p>
          {itineraryError ? (
            <p className="mt-2 text-sm text-red-700">{String(itineraryError.message)}</p>
          ) : null}
        </div>

        {!days.length ? (
          <div className="space-y-3 rounded-xl border border-border bg-card px-4 py-6">
            <p className="text-sm text-muted-foreground">
              {itinerary?.itineraryId
                ? 'No days on this itinerary yet.'
                : 'No itinerary for this trip yet.'}
            </p>
            <div className="flex flex-wrap gap-2">
              {!itinerary?.itineraryId ? (
                <button
                  type="button"
                  className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                  onClick={() => void bootstrapItinerary()}
                >
                  Create itinerary + Day 1
                </button>
              ) : (
                <button
                  type="button"
                  className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                  onClick={() => setShowAddDay(true)}
                >
                  Add day
                </button>
              )}
            </div>
            {itinMsg ? <p className="text-sm text-muted-foreground">{itinMsg}</p> : null}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
            <ul className="space-y-1">
              {days.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => setActiveDayId(d.id)}
                    className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                      activeDay?.id === d.id
                        ? 'border-primary bg-primary/5 font-medium'
                        : 'border-border bg-card hover:bg-muted'
                    }`}
                  >
                    Day {d.dayNumber}
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {d.date}
                      {d.theme ? ` · ${d.theme}` : ''}
                    </span>
                  </button>
                </li>
              ))}
              {itinerary?.itineraryId ? (
                <li className="space-y-2">
                  {showAddDay ? (
                    <form
                      onSubmit={(e) => void addDay(e)}
                      className="space-y-2 rounded-xl border border-border bg-card p-3"
                    >
                      <p className="text-xs font-medium">New day theme</p>
                      <input
                        className="h-9 w-full rounded-lg border border-border px-2 text-sm"
                        placeholder="e.g. Marais welcome"
                        value={newDayTheme}
                        onChange={(e) => setNewDayTheme(e.target.value)}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="h-8 rounded-lg bg-primary px-2 text-xs text-primary-foreground"
                        >
                          Save day
                        </button>
                        <button
                          type="button"
                          className="h-8 rounded-lg border border-border px-2 text-xs"
                          onClick={() => {
                            setShowAddDay(false);
                            setNewDayTheme('');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAddDay(true)}
                      className="w-full rounded-xl border border-dashed border-border px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
                    >
                      + Add day
                    </button>
                  )}
                </li>
              ) : null}
            </ul>

            {activeDay ? (
              <div className="space-y-4">
                <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
                  <h3 className="font-semibold">Day {activeDay.dayNumber} details</h3>
                  <p className="text-xs text-muted-foreground">
                    Theme is the subtitle under the day (e.g. “Marais welcome”).
                  </p>
                  <label className="block text-sm">
                    Theme
                    <input
                      className="mt-1 h-10 w-full rounded-xl border border-border px-3 text-sm"
                      value={dayThemeDraft}
                      onChange={(e) => setDayThemeDraft(e.target.value)}
                      placeholder="e.g. Marais welcome"
                    />
                  </label>
                  <label className="block text-sm">
                    Date
                    <input
                      type="date"
                      className="mt-1 h-10 w-full rounded-xl border border-border px-3 text-sm"
                      value={dayDateDraft}
                      onChange={(e) => setDayDateDraft(e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    Area (gems)
                    <select
                      className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
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
                    Narrows gem catalog for this day (e.g. Le Marais vs whole Paris).
                  </p>
                  <button
                    type="button"
                    onClick={() => void saveDayMeta()}
                    className="h-10 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
                  >
                    Save day details
                  </button>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="font-semibold">Day {activeDay.dayNumber} items</h3>
                  <ul className="mt-3 space-y-3">
                    {[...activeDay.items]
                      .sort((a, b) => (a.timeSlot ?? '').localeCompare(b.timeSlot ?? ''))
                      .map((item) => (
                        <ItineraryItemRow
                          key={`${item.id}:${item.title}:${item.timeSlot ?? ''}`}
                          item={item}
                          onSave={saveItem}
                          onRemove={removeItem}
                        />
                      ))}
                    {!activeDay.items.length ? (
                      <li className="text-sm text-muted-foreground">No items yet.</li>
                    ) : null}
                  </ul>
                </div>

                <form
                  onSubmit={addManualItem}
                  className="space-y-3 rounded-2xl border border-border bg-card p-5"
                >
                  <h3 className="font-semibold">Add custom item</h3>
                  <input
                    className="h-11 w-full rounded-xl border border-border px-3 text-sm"
                    placeholder="Title (e.g. Hotel check-in)"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    required
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select
                      className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm capitalize"
                      value={manualType}
                      onChange={(e) => setManualType(e.target.value)}
                    >
                      {['activity', 'eat', 'drink', 'transit', 'hidden_gem', 'other'].map(
                        (t) => (
                          <option key={t} value={t}>
                            {t.replace('_', ' ')}
                          </option>
                        ),
                      )}
                    </select>
                    <input
                      className="h-11 w-full rounded-xl border border-border px-3 text-sm"
                      type="time"
                      value={manualSlot}
                      onChange={(e) => setManualSlot(e.target.value)}
                      required
                    />
                  </div>
                  <input
                    className="h-11 w-full rounded-xl border border-border px-3 text-sm"
                    placeholder="Location (optional)"
                    value={manualLocation}
                    onChange={(e) => setManualLocation(e.target.value)}
                  />
                  <textarea
                    className="min-h-20 w-full rounded-xl border border-border px-3 py-2 text-sm"
                    placeholder="Notes (optional)"
                    value={manualNotes}
                    onChange={(e) => setManualNotes(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="h-11 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
                  >
                    Add custom item
                  </button>
                </form>

                <form
                  onSubmit={addFromGem}
                  className="space-y-3 rounded-2xl border border-border bg-card p-5"
                >
                  <h3 className="font-semibold">Add from gems</h3>
                  <select
                    className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
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
                    className="h-11 w-full rounded-xl border border-border px-3 text-sm"
                    type="time"
                    value={timeSlot}
                    onChange={(e) => setTimeSlot(e.target.value)}
                    required
                  />
                  <button
                    type="submit"
                    disabled={!availableGems.length}
                    className="h-11 rounded-xl border border-border bg-secondary px-4 text-sm font-medium disabled:opacity-50"
                  >
                    Add gem to day
                  </button>
                  {!availableGems.length ? (
                    <p className="text-xs text-muted-foreground">
                      No unused trip gems available for this destination.
                    </p>
                  ) : null}
                  {itinMsg ? (
                    <p className="text-sm text-muted-foreground">{itinMsg}</p>
                  ) : null}
                </form>
              </div>
            ) : null}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-2xl font-semibold">Message board</h2>
          <p className="text-sm text-muted-foreground">
            One-way alerts and notices for travelers on this trip. Posts appear in their
            notification center.
          </p>
        </div>

        <form
          onSubmit={(e) => void onPostMessage(e)}
          className="max-w-xl space-y-3 rounded-2xl border border-border bg-card p-5"
        >
          <div className="flex flex-wrap gap-3">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Kind</span>
              <select
                className="block h-10 rounded-xl border border-border bg-background px-3"
                value={msgKind}
                onChange={(e) =>
                  setMsgKind(e.target.value as 'alert' | 'info' | 'notice')
                }
              >
                <option value="info">Info</option>
                <option value="notice">Notice</option>
                <option value="alert">Alert</option>
              </select>
            </label>
          </div>
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">Title</span>
            <input
              className="h-11 w-full rounded-xl border border-border px-3"
              value={msgTitle}
              onChange={(e) => setMsgTitle(e.target.value)}
              placeholder="Meeting point update"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">Message</span>
            <textarea
              className="min-h-24 w-full rounded-xl border border-border px-3 py-2"
              value={msgBody}
              onChange={(e) => setMsgBody(e.target.value)}
              placeholder="Details travelers should know…"
            />
          </label>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="h-11 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Post to travelers
            </button>
            {msgStatus ? (
              <p className="text-sm text-muted-foreground">{msgStatus}</p>
            ) : null}
          </div>
        </form>

        <ul className="space-y-2">
          {boardMessages.length === 0 ? (
            <li className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
              No messages yet.
            </li>
          ) : (
            boardMessages.map((m) => (
              <li
                key={m.id}
                className="rounded-xl border border-border bg-card px-4 py-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">
                    {m.kind}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(m.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 font-medium">{m.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground whitespace-pre-wrap">
                  {m.body}
                </p>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="space-y-6">
        <div>
          <h2 className="font-display text-2xl font-semibold">Travelers</h2>
          <p className="text-sm text-muted-foreground">
            {clientsMeta?.independent
              ? 'Independent (B2C) trip — travelers linked to this trip.'
              : 'Search travelers on this trip. Open a traveler to manage their vault documents.'}
          </p>
        </div>

        {!clientsMeta?.independent ? (
          <form onSubmit={onAdd} className="flex max-w-lg gap-2">
            <input
              className="h-11 flex-1 rounded-xl border border-border px-3"
              type="email"
              placeholder="client@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button
              type="submit"
              className="h-11 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Add traveler
            </button>
          </form>
        ) : null}
        {lastInvite ? (
          <div className="rounded-xl border border-accent/40 bg-card p-4 text-sm">
            <p className="font-medium">Pending invite link</p>
            <p className="mt-1 break-all font-mono text-xs">{lastInvite}</p>
            <button
              type="button"
              className="mt-2 text-primary underline"
              onClick={() => navigator.clipboard.writeText(lastInvite)}
            >
              Copy invite link
            </button>
          </div>
        ) : null}

        <div className="space-y-3">
          <ListControls
            search={travelers.search}
            onSearchChange={travelers.setSearch}
            placeholder="Search travelers…"
            page={travelers.page}
            pageCount={travelers.pageCount}
            pageSize={travelers.pageSize}
            onPageChange={travelers.setPage}
            onPageSizeChange={travelers.setPageSize}
            from={travelers.from}
            to={travelers.to}
            total={travelers.total}
          />
          {travelers.error ? (
            <p className="text-sm text-red-700">
              Could not load travelers.{' '}
              {travelers.error instanceof Error ? travelers.error.message : ''}
            </p>
          ) : null}
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Vault docs</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {travelers.pageItems.map((u) => (
                  <tr key={u.id} className="border-b border-border">
                    <td className="px-4 py-3 font-medium">{u.name ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {u.isOwner ? 'Owner' : 'Registered'}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted-foreground">
                      {u.docCount ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/trips/${tripId}/travelers/${u.id}`}
                        className="text-primary underline"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
                {!travelers.isLoading && !travelers.total ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-6 text-center text-muted-foreground"
                    >
                      No travelers match.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        {!clientsMeta?.independent ? (
          <div>
            <h3 className="font-semibold">Pending invites</h3>
            <ul className="mt-2 space-y-2">
              {(clientsMeta?.pending ?? []).map((inv) => {
                const link = `${CLIENT_APP}/register?code=${inv.code}`;
                return (
                  <li
                    key={inv.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm"
                  >
                    <span>
                      {inv.email} · code <code>{inv.code}</code>{' '}
                      <span className="text-muted-foreground">(Pending Invite)</span>
                    </span>
                    <button
                      type="button"
                      className="text-primary underline"
                      onClick={() => navigator.clipboard.writeText(link)}
                    >
                      Copy invite link
                    </button>
                  </li>
                );
              })}
              {!clientsMeta?.pending?.length ? (
                <li className="text-sm text-muted-foreground">No pending invites.</li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function ItineraryItemRow({
  item,
  onSave,
  onRemove,
}: {
  item: ItineraryItem;
  onSave: (
    item: ItineraryItem,
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
  const [title, setTitle] = useState(item.title);
  const [slot, setSlot] = useState(item.timeSlot ?? '');
  const [itemType, setItemType] = useState(item.itemType);
  const [location, setLocation] = useState(item.locationName ?? '');
  const [notes, setNotes] = useState(item.description ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(item.title);
    setSlot(item.timeSlot ?? '');
    setItemType(item.itemType);
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

  const dirty =
    title !== item.title ||
    slot !== (item.timeSlot ?? '') ||
    itemType !== item.itemType ||
    location !== (item.locationName ?? '') ||
    notes !== (item.description ?? '');

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
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="space-y-2 rounded-xl border border-border bg-background p-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input
          className="h-9 w-full rounded-lg border border-border px-2 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          required
        />
        <input
          className="h-9 w-full rounded-lg border border-border px-2 text-sm sm:w-32"
          type="time"
          value={slot}
          onChange={(e) => setSlot(e.target.value)}
          required
        />
        <select
          className="h-9 w-full rounded-lg border border-border bg-background px-2 text-sm capitalize sm:w-36"
          value={itemType}
          onChange={(e) => setItemType(e.target.value)}
        >
          {['activity', 'eat', 'drink', 'transit', 'hidden_gem', 'other'].map((t) => (
            <option key={t} value={t}>
              {t.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>
      <input
        className="h-9 w-full rounded-lg border border-border px-2 text-sm"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Location"
      />
      <textarea
        className="min-h-16 w-full rounded-lg border border-border px-2 py-1.5 text-sm"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes"
      />
      <div className="flex gap-3 text-xs">
        <button
          type="button"
          disabled={!dirty || saving || !slot || !title.trim()}
          className="text-primary underline disabled:opacity-40"
          onClick={() => void save()}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          className="text-red-700 underline"
          onClick={() => onRemove(item.id)}
        >
          Remove
        </button>
      </div>
    </li>
  );
}
