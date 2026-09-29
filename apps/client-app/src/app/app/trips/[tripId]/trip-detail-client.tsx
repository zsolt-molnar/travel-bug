"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiGet } from "@/lib/api";
import { mockDocuments, mockTimeline, mockTrips } from "@/lib/mock/data";
import type { TimelineItem } from "@/lib/types";

type ItineraryResponse = {
  tripId: string;
  days: Array<{
    dayNumber: number;
    date: string;
    theme?: string | null;
    items: TimelineItem[];
  }>;
};

export default function TripDetailClient() {
  const params = useParams();
  const tripId = String(params.tripId);
  const trip = mockTrips.find((t) => t.id === tripId) ?? mockTrips[0];
  const { data } = useSWR(
    `itinerary:${tripId}`,
    () => apiGet<ItineraryResponse>(`/itinerary/${tripId}`),
    { shouldRetryOnError: false },
  );

  const [items, setItems] = useState<TimelineItem[]>(mockTimeline);
  const [attachFor, setAttachFor] = useState<string | null>(null);

  useEffect(() => {
    if (data?.days?.length) {
      setItems(data.days.flatMap((d) => d.items));
    }
  }, [data]);

  const byDay = useMemo(() => {
    const map = new Map<number, TimelineItem[]>();
    for (const item of items) {
      const list = map.get(item.dayNumber) ?? [];
      list.push(item);
      map.set(item.dayNumber, list);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [items]);

  function attachDoc(itemId: string, documentId: string) {
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, documentId } : i)),
    );
    setAttachFor(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">
          {trip.destination}
        </h1>
        <p className="text-sm text-muted-foreground">
          {trip.startDate} → {trip.endDate}
        </p>
      </div>

      <div className="space-y-6">
        {byDay.map(([day, dayItems]) => (
          <section key={day}>
            <h2 className="mb-3 font-display text-lg font-semibold">
              Day {day}
            </h2>
            <ol className="relative space-y-4 border-l-2 border-primary/40 pl-4">
              {dayItems.map((item) => {
                const doc = mockDocuments.find((d) => d.id === item.documentId);
                return (
                  <li key={item.id} className="relative">
                    <span className="absolute -left-[1.4rem] top-1.5 h-3 w-3 rounded-full bg-primary" />
                    <Card>
                      <CardContent className="space-y-2 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {item.timeSlot}
                          </span>
                          <Badge className="capitalize">{item.itemType}</Badge>
                        </div>
                        <p className="font-medium">{item.title}</p>
                        {item.locationName ? (
                          <p className="text-sm text-muted-foreground">
                            {item.locationName}
                          </p>
                        ) : null}
                        {doc ? (
                          <Button variant="secondary" size="sm">
                            Show Ticket / Pass · {doc.title}
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setAttachFor(
                                attachFor === item.id ? null : item.id,
                              )
                            }
                          >
                            Attach from Vault
                          </Button>
                        )}
                        {attachFor === item.id ? (
                          <div className="space-y-2 rounded-xl bg-muted p-2">
                            {mockDocuments.map((d) => (
                              <button
                                key={d.id}
                                type="button"
                                className="block w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-card"
                                onClick={() => attachDoc(item.id, d.id)}
                              >
                                {d.title}
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
