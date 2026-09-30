'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiGet } from '@/lib/api';
import { AttachmentViewButton } from '@/components/attachment-viewer';
import type { DocCategory, Trip, VaultDocument } from '@/lib/types';

type ItineraryItem = {
  id: string;
  timeSlot: string | null;
  itemType: string;
  title: string;
  description?: string | null;
  locationName?: string | null;
  documentId?: string | null;
  gemId?: string | null;
};

type ItineraryDay = {
  id: string;
  dayNumber: number;
  date: string;
  theme?: string | null;
  items: ItineraryItem[];
};

type ItineraryPayload = {
  tripId: string;
  itineraryId?: string;
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

type NeededDoc = {
  key: string;
  stepTitle: string;
  stepWhen: string;
  source: 'day' | 'trip';
  docType: DocCategory | string;
  doc?: VaultDocument;
};

const PREVIEW_COUNT = 2;

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

/** Ongoing first, then upcoming by start date. */
function listRelevantTrips(trips: Trip[], today: string): Trip[] {
  const ongoing = trips
    .filter((t) => t.startDate <= today && today <= t.endDate)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const upcoming = trips
    .filter((t) => t.startDate > today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  return [...ongoing, ...upcoming];
}

function tripPhaseOf(trip: Trip, today: string): 'ongoing' | 'upcoming' {
  if (trip.startDate <= today && today <= trip.endDate) return 'ongoing';
  return 'upcoming';
}

function formatDocType(t: string) {
  return t.replace(/_/g, ' ');
}

function ShowMoreToggle({
  expanded,
  hiddenCount,
  onToggle,
}: {
  expanded: boolean;
  hiddenCount: number;
  onToggle: () => void;
}) {
  if (hiddenCount <= 0 && !expanded) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle();
      }}
      className="w-full rounded-xl border border-dashed border-border bg-card px-3 py-2.5 text-sm text-primary hover:bg-muted/60"
    >
      {expanded ? 'Show less' : `Show more (${hiddenCount})`}
    </button>
  );
}

export default function DashboardPage() {
  const today = todayIso();
  const [tripsExpanded, setTripsExpanded] = useState(false);
  const [dayExpanded, setDayExpanded] = useState(false);
  const [docsExpanded, setDocsExpanded] = useState(false);

  const {
    data: trips,
    error,
    isLoading,
  } = useSWR('trips', () => apiGet<Trip[]>('/trips'));

  const relevantTrips = useMemo(
    () => (trips ? listRelevantTrips(trips, today) : []),
    [trips, today],
  );
  const primaryTrip = relevantTrips[0] ?? null;

  const { data: itinerary, isLoading: itinLoading } = useSWR(
    primaryTrip ? `itinerary:${primaryTrip.id}` : null,
    () => apiGet<ItineraryPayload>(`/itinerary/${primaryTrip!.id}`),
  );

  const { data: vaultDocs = [] } = useSWR('vault', async () => {
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

  const days = itinerary?.days ?? [];
  const tripDocs = useMemo(
    () => (primaryTrip ? vaultDocs.filter((d) => d.tripId === primaryTrip.id) : []),
    [vaultDocs, primaryTrip],
  );

  const focusDay = useMemo(() => {
    if (!days.length || !primaryTrip) return null;
    const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
    const phase = tripPhaseOf(primaryTrip, today);
    if (phase === 'ongoing') {
      return (
        sorted.find((d) => d.date === today) ??
        sorted.find((d) => d.date >= today) ??
        sorted[sorted.length - 1] ??
        null
      );
    }
    return sorted[0] ?? null;
  }, [days, primaryTrip, today]);

  const dayItems = useMemo(() => {
    if (!focusDay) return [];
    return [...focusDay.items].sort((a, b) =>
      (a.timeSlot ?? '').localeCompare(b.timeSlot ?? ''),
    );
  }, [focusDay]);

  const neededDocs = useMemo((): NeededDoc[] => {
    if (!primaryTrip) return [];
    const phase = tripPhaseOf(primaryTrip, today);
    const windowStart = phase === 'upcoming' ? primaryTrip.startDate : today;
    const windowEnd = addDaysIso(windowStart, 2);
    const upcomingDays = [...days]
      .filter((d) => d.date >= windowStart && d.date <= windowEnd)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (focusDay && !upcomingDays.some((d) => d.id === focusDay.id)) {
      upcomingDays.unshift(focusDay);
    }

    const out: NeededDoc[] = [];
    const seenDocIds = new Set<string>();

    for (const day of upcomingDays) {
      const items = [...day.items].sort((a, b) =>
        (a.timeSlot ?? '').localeCompare(b.timeSlot ?? ''),
      );
      for (const item of items) {
        if (!item.documentId) continue;
        if (seenDocIds.has(item.documentId)) continue;
        seenDocIds.add(item.documentId);
        const doc = tripDocs.find((d) => d.id === item.documentId);
        const when = `${day.date}${item.timeSlot ? ` · ${item.timeSlot}` : ''}`;
        out.push({
          key: `day:${item.documentId}`,
          stepTitle: item.title,
          stepWhen: when,
          source: 'day',
          docType: doc?.docType ?? 'ticket',
          doc,
        });
      }
    }

    for (const doc of tripDocs) {
      if (seenDocIds.has(doc.id)) continue;
      seenDocIds.add(doc.id);
      out.push({
        key: `trip:${doc.id}`,
        stepTitle: 'Trip vault',
        stepWhen: primaryTrip.title || primaryTrip.destination,
        source: 'trip',
        docType: doc.docType,
        doc,
      });
    }

    return out;
  }, [primaryTrip, days, tripDocs, today, focusDay]);

  const visibleTrips = tripsExpanded
    ? relevantTrips
    : relevantTrips.slice(0, PREVIEW_COUNT);
  const hiddenTripCount = Math.max(0, relevantTrips.length - PREVIEW_COUNT);

  const visibleDayItems = dayExpanded ? dayItems : dayItems.slice(0, PREVIEW_COUNT);
  const hiddenDayCount = Math.max(0, dayItems.length - PREVIEW_COUNT);

  const visibleDocs = docsExpanded ? neededDocs : neededDocs.slice(0, PREVIEW_COUNT);
  const hiddenDocCount = Math.max(0, neededDocs.length - PREVIEW_COUNT);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading your trips…</p>;
  }

  if (error) {
    return (
      <div className="space-y-2">
        <h1 className="font-display text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-destructive">
          Could not load trips. {error instanceof Error ? error.message : ''}
        </p>
      </div>
    );
  }

  if (!relevantTrips.length) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            No upcoming trips — create one to get started.
          </p>
        </div>
        <Link href="/app/trips">
          <Button>Create a trip</Button>
        </Link>
      </div>
    );
  }

  const primaryPhase = tripPhaseOf(primaryTrip!, today);
  const tripName = primaryTrip!.title || primaryTrip!.destination;
  const dayLabel =
    primaryPhase === 'ongoing' && focusDay?.date === today
      ? `${tripName} · Today`
      : focusDay
        ? `${tripName} · Day ${focusDay.dayNumber}`
        : tripName;
  const dayTheme =
    focusDay?.theme &&
    focusDay.theme.trim().toLowerCase() !== `day ${focusDay.dayNumber}`.toLowerCase()
      ? focusDay.theme
      : null;
  const dayMetaParts: string[] = [];
  if (primaryPhase === 'upcoming') {
    dayMetaParts.push(`starts ${primaryTrip!.startDate}`);
  } else if (focusDay) {
    dayMetaParts.push(focusDay.date);
  }
  if (focusDay && dayItems.length) {
    dayMetaParts.push(`${dayItems.length} stop${dayItems.length === 1 ? '' : 's'}`);
  }
  dayMetaParts.push('Tap to open itinerary');

  const itineraryHref = focusDay
    ? `/app/trips/detail?tripId=${primaryTrip!.id}&dayId=${focusDay.id}`
    : `/app/trips/detail?tripId=${primaryTrip!.id}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Upcoming trips, today’s plan, and documents you’ll need next.
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold">Upcoming trips</h2>
            <p className="text-sm text-muted-foreground">
              Active now and next on your calendar.
            </p>
          </div>
          <Link href="/app/trips" className="text-xs text-primary underline">
            All trips
          </Link>
        </div>

        <div className="space-y-2">
          {visibleTrips.map((trip) => {
            const phase = tripPhaseOf(trip, today);
            const href = `/app/trips/detail?tripId=${trip.id}`;
            const featured = trip.id === primaryTrip?.id;
            return (
              <Link key={trip.id} href={href} className="block">
                <Card
                  className={
                    featured
                      ? 'overflow-hidden border-none bg-primary text-primary-foreground'
                      : 'overflow-hidden transition hover:border-primary'
                  }
                >
                  <CardContent className="space-y-2 p-4">
                    <Badge
                      className={
                        featured ? 'w-fit border-0 bg-white/15 text-white' : 'w-fit'
                      }
                    >
                      {phase === 'ongoing' ? 'Active now' : 'Upcoming'}
                    </Badge>
                    <p
                      className={`font-display text-xl font-semibold leading-snug ${
                        featured ? 'text-white' : 'text-foreground'
                      }`}
                    >
                      {trip.title || trip.destination}
                    </p>
                    <p
                      className={
                        featured
                          ? 'text-sm text-white/80'
                          : 'text-sm text-muted-foreground'
                      }
                    >
                      {trip.destination} · {trip.startDate} → {trip.endDate}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
          <ShowMoreToggle
            expanded={tripsExpanded}
            hiddenCount={hiddenTripCount}
            onToggle={() => setTripsExpanded((v) => !v)}
          />
        </div>
      </section>

      <section className="space-y-3">
        <Link href={itineraryHref} className="block space-y-3 rounded-2xl outline-none">
          <div className="flex items-end justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground">
                {dayLabel}
              </h2>
              {dayTheme ? (
                <p className="text-sm text-muted-foreground">{dayTheme}</p>
              ) : null}
              {focusDay ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {dayMetaParts.join(' · ')}
                </p>
              ) : null}
            </div>
            <span className="text-xs text-primary underline">Open</span>
          </div>

          {itinLoading ? (
            <p className="text-sm text-muted-foreground">Loading itinerary…</p>
          ) : !focusDay ? (
            <Card>
              <CardContent className="p-4 text-sm text-muted-foreground">
                No itinerary days yet for this trip.
              </CardContent>
            </Card>
          ) : !dayItems.length ? (
            <Card>
              <CardContent className="p-4 text-sm text-muted-foreground">
                Nothing scheduled for this day yet.
              </CardContent>
            </Card>
          ) : (
            <ol className="relative space-y-3 border-l-2 border-primary/40 pl-4">
              {visibleDayItems.map((item) => {
                const hasAttachment = Boolean(item.documentId);
                const attached = hasAttachment
                  ? tripDocs.find((d) => d.id === item.documentId)
                  : undefined;
                return (
                  <li key={item.id} className="relative">
                    <span className="absolute -left-[1.4rem] top-2 h-3 w-3 rounded-full bg-primary" />
                    <Card>
                      <CardContent className="space-y-1.5 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm tabular-nums text-muted-foreground">
                            {item.timeSlot ?? '—'}
                          </span>
                          <Badge className="capitalize">
                            {String(item.itemType).replace(/_/g, ' ')}
                          </Badge>
                          {hasAttachment ? (
                            <Badge className="border-transparent bg-primary/15 text-primary">
                              {attached?.docType
                                ? formatDocType(attached.docType)
                                : 'Attached'}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="font-medium leading-snug text-foreground">
                          {item.title}
                        </p>
                        {item.locationName ? (
                          <p className="text-xs text-muted-foreground">
                            {item.locationName}
                          </p>
                        ) : null}
                        {item.description ? (
                          <p className="line-clamp-2 text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        ) : null}
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ol>
          )}
        </Link>
        {dayItems.length > PREVIEW_COUNT ? (
          <ShowMoreToggle
            expanded={dayExpanded}
            hiddenCount={hiddenDayCount}
            onToggle={() => setDayExpanded((v) => !v)}
          />
        ) : null}
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold">Documents you’ll need</h2>
            <p className="text-sm text-muted-foreground">
              For today’s / upcoming steps, plus trip vault files.
            </p>
          </div>
          <Link href="/app/vault" className="text-xs text-primary underline">
            Vault
          </Link>
        </div>

        {!neededDocs.length ? (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">
              No vault documents for this trip yet. Upload in Vault, then attach them to
              day items.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {visibleDocs.map((n) => (
              <Card key={n.key}>
                <CardContent className="space-y-1.5 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      className={
                        n.source === 'day'
                          ? 'border-transparent bg-primary/15 text-primary'
                          : undefined
                      }
                    >
                      {n.source === 'day' ? 'For today / soon' : 'Trip vault'}
                    </Badge>
                    <Badge className="capitalize">{formatDocType(n.docType)}</Badge>
                  </div>
                  <p className="font-medium leading-snug text-foreground">
                    {n.doc?.title ?? formatDocType(n.docType)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {n.source === 'day'
                      ? `For ${n.stepTitle} · ${n.stepWhen}`
                      : n.stepWhen}
                  </p>
                  <div className="pt-0.5">
                    {n.doc ? (
                      <AttachmentViewButton
                        attachment={{
                          title: n.doc.title,
                          fileUrl: n.doc.fileUrl,
                          docType: n.doc.docType,
                        }}
                        className="text-xs text-primary underline"
                      >
                        View
                      </AttachmentViewButton>
                    ) : (
                      <Link href="/app/vault" className="text-xs text-primary underline">
                        Open vault
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            <ShowMoreToggle
              expanded={docsExpanded}
              hiddenCount={hiddenDocCount}
              onToggle={() => setDocsExpanded((v) => !v)}
            />
          </div>
        )}
      </section>
    </div>
  );
}
