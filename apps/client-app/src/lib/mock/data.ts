import type { Trip, VaultDocument, TimelineItem } from "../types";
import { SEED_IDS } from "../types";

export const mockTrips: Trip[] = [
  {
    id: SEED_IDS.trip,
    userId: SEED_IDS.traveler,
    operatorId: SEED_IDS.operator,
    destination: "Paris, France",
    startDate: "2026-10-12",
    endDate: "2026-10-18",
  },
];

export const mockDocuments: VaultDocument[] = [
  {
    id: "00000000-0000-4000-8000-000000000031",
    userId: SEED_IDS.traveler,
    tripId: SEED_IDS.trip,
    docType: "passport",
    title: "EU Passport",
    fileUrl: "/mock/passport.pdf",
  },
  {
    id: "00000000-0000-4000-8000-000000000032",
    userId: SEED_IDS.traveler,
    tripId: SEED_IDS.trip,
    docType: "insurance",
    title: "Travel Insurance Policy",
    fileUrl: "/mock/insurance.pdf",
  },
  {
    id: "00000000-0000-4000-8000-000000000033",
    userId: SEED_IDS.traveler,
    tripId: SEED_IDS.trip,
    docType: "museum_event",
    title: "Louvre Museum Pass",
    fileUrl: "/mock/louvre.pdf",
  },
  {
    id: "00000000-0000-4000-8000-000000000034",
    userId: SEED_IDS.traveler,
    tripId: SEED_IDS.trip,
    docType: "flight",
    title: "CDG Arrival Boarding Pass",
    fileUrl: "/mock/flight.pdf",
  },
];

export const mockTimeline: TimelineItem[] = [
  {
    id: "tl-1",
    dayNumber: 1,
    date: "2026-10-12",
    timeSlot: "14:00",
    itemType: "activity",
    title: "Arrive CDG → Hotel check-in",
    locationName: "Le Marais",
    documentId: "00000000-0000-4000-8000-000000000034",
  },
  {
    id: "tl-2",
    dayNumber: 1,
    date: "2026-10-12",
    timeSlot: "19:30",
    itemType: "eat",
    title: "Bistro dinner",
    locationName: "Chez Janou",
  },
  {
    id: "tl-3",
    dayNumber: 2,
    date: "2026-10-13",
    timeSlot: "10:00",
    itemType: "activity",
    title: "Louvre morning visit",
    locationName: "Louvre Museum",
    documentId: "00000000-0000-4000-8000-000000000033",
  },
  {
    id: "tl-4",
    dayNumber: 2,
    date: "2026-10-13",
    timeSlot: "16:00",
    itemType: "hidden_gem",
    title: "Covered Passage des Panoramas",
    locationName: "2nd Arrondissement",
  },
  {
    id: "tl-5",
    dayNumber: 2,
    date: "2026-10-13",
    timeSlot: "20:00",
    itemType: "drink",
    title: "Natural wine bar",
    locationName: "Septime Cave",
  },
];
