"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiGet, apiPost } from "@/lib/api";
import type { Trip } from "@/lib/types";
import { mockTrips } from "@/lib/mock/data";

export default function TripsPage() {
  const { data, mutate } = useSWR("trips", () => apiGet<Trip[]>("/trips"), {
    fallbackData: mockTrips,
    shouldRetryOnError: false,
  });
  const trips = data ?? mockTrips;
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!destination || !startDate || !endDate) return;
    try {
      await apiPost("/trips", { destination, startDate, endDate });
      await mutate();
    } catch {
      // offline / API down — keep UI usable via local optimistic add
      await mutate(
        [
          {
            id: crypto.randomUUID(),
            userId: "local",
            destination,
            startDate,
            endDate,
          },
          ...trips,
        ],
        false,
      );
    }
    setDestination("");
    setStartDate("");
    setEndDate("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Trips</h1>
        <p className="text-sm text-muted-foreground">
          Create and open day-by-day timelines.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New trip</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={onCreate}>
            <div className="space-y-2">
              <Label htmlFor="dest">Destination</Label>
              <Input
                id="dest"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Tokyo, Japan"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="start">Start</Label>
                <Input
                  id="start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end">End</Label>
                <Input
                  id="end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <Button type="submit" className="w-full">
              Create trip
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {trips.map((trip) => (
          <Link key={trip.id} href={`/app/trips/${trip.id}`}>
            <Card className="mb-3 transition hover:border-primary">
              <CardContent className="p-4">
                <p className="font-medium">{trip.destination}</p>
                <p className="text-sm text-muted-foreground">
                  {trip.startDate} → {trip.endDate}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
