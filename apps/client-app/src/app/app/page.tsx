"use client";

import useSWR from "swr";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiGet } from "@/lib/api";
import type { Trip } from "@/lib/types";
import { mockTrips } from "@/lib/mock/data";

export default function DashboardPage() {
  const { data } = useSWR("trips", () => apiGet<Trip[]>("/trips"), {
    fallbackData: mockTrips,
    shouldRetryOnError: false,
  });
  const trip = data?.[0] ?? mockTrips[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Your upcoming trip at a glance.
        </p>
      </div>

      <Card className="overflow-hidden border-none bg-primary text-primary-foreground">
        <CardHeader>
          <Badge className="w-fit border-0 bg-white/15 text-white">
            Upcoming trip
          </Badge>
          <CardTitle className="text-2xl text-white">
            {trip.destination}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-white/80">
          {trip.startDate} → {trip.endDate}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/app/vault">
          <Button className="h-auto w-full flex-col gap-1 py-4" variant="secondary">
            Upload Document
          </Button>
        </Link>
        <Link href={`/app/trips/${trip.id}`}>
          <Button className="h-auto w-full flex-col gap-1 py-4">
            View Itinerary
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agency alerts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>· Your Louvre pass was shared by the agency — check Vault.</p>
          <p>· Day 2 hidden gem updated: Passage des Panoramas.</p>
        </CardContent>
      </Card>
    </div>
  );
}
