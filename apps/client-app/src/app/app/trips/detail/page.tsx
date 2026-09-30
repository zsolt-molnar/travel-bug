import { Suspense } from 'react';
import TripDetailClient from './trip-detail-client';

export default function TripDetailPage() {
  return (
    <Suspense
      fallback={<p className="text-sm text-muted-foreground">Loading itinerary…</p>}
    >
      <TripDetailClient />
    </Suspense>
  );
}
