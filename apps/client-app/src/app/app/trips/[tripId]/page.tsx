import TripDetailClient from "./trip-detail-client";

export function generateStaticParams() {
  return [{ tripId: "00000000-0000-4000-8000-000000000020" }];
}

export default function TripDetailPage() {
  return <TripDetailClient />;
}
