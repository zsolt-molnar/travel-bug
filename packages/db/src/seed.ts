import { config } from "dotenv";
import { resolve } from "node:path";
import { sql } from "drizzle-orm";
import { createDb } from "./client";
import { SEED_IDS } from "./seed-ids";
import {
  hiddenGems,
  invites,
  itineraries,
  itineraryDays,
  itineraryItems,
  operators,
  tripTravelers,
  trips,
  userDocuments,
  users,
} from "./schema";

config({ path: resolve(__dirname, "../../../.env") });

async function seed() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  const db = createDb(url);

  // Idempotent re-seed for local POC
  await db.execute(sql`TRUNCATE TABLE
    document_chunks,
    itinerary_items,
    itinerary_days,
    itineraries,
    user_documents,
    invites,
    trip_travelers,
    trips,
    hidden_gems,
    users,
    operators
    CASCADE`);

  await db.insert(operators).values({
    id: SEED_IDS.operator,
    name: "Demo Travel Agency",
    brandConfig: { primaryColor: "#0d5c63", logo: null },
  });

  await db.insert(users).values([
    {
      id: SEED_IDS.superadmin,
      email: "superadmin@travelbug.demo",
      name: "Super Admin",
      role: "superadmin",
      operatorId: null,
    },
    {
      id: SEED_IDS.agencyManager,
      email: "manager@demo-agency.test",
      name: "Ada Manager",
      role: "agency_manager",
      operatorId: SEED_IDS.operator,
    },
    {
      id: SEED_IDS.agencyAgent,
      email: "agent@demo-agency.test",
      name: "Alex Agent",
      role: "agency_agent",
      operatorId: SEED_IDS.operator,
    },
    {
      id: SEED_IDS.traveler,
      email: "traveler@travelbug.demo",
      name: "Demo Traveler",
      role: "traveler",
      operatorId: SEED_IDS.operator,
    },
  ]);

  await db.insert(trips).values({
    id: SEED_IDS.trip,
    userId: SEED_IDS.traveler,
    operatorId: SEED_IDS.operator,
    destination: "Paris, France",
    startDate: "2026-10-12",
    endDate: "2026-10-18",
  });

  await db.insert(tripTravelers).values({
    tripId: SEED_IDS.trip,
    userId: SEED_IDS.traveler,
  });

  await db.insert(invites).values({
    id: SEED_IDS.invite,
    tripId: SEED_IDS.trip,
    operatorId: SEED_IDS.operator,
    email: "pending.client@example.com",
    code: "PARIS-VIP",
    status: "pending",
  });

  await db.insert(hiddenGems).values([
    {
      id: SEED_IDS.gem1,
      operatorId: SEED_IDS.operator,
      title: "Passage des Panoramas",
      category: "activity",
      description: "Historic covered passage with old print shops and cafés.",
      neighborhood: "2nd Arrondissement",
      tags: ["quiet", "local", "covered"],
    },
    {
      id: SEED_IDS.gem2,
      operatorId: SEED_IDS.operator,
      title: "Septime Cave",
      category: "drink",
      description: "Natural wine bar beloved by locals.",
      neighborhood: "11th Arrondissement",
      tags: ["wine", "local"],
    },
    {
      id: SEED_IDS.gem3,
      operatorId: SEED_IDS.operator,
      title: "Chez Janou",
      category: "eat",
      description:
        "Provençal bistro in the Marais with legendary chocolate mousse.",
      neighborhood: "Le Marais",
      tags: ["bistro", "classic"],
    },
  ]);

  await db.insert(userDocuments).values([
    {
      id: SEED_IDS.docPassport,
      userId: SEED_IDS.traveler,
      tripId: SEED_IDS.trip,
      docType: "passport",
      title: "EU Passport",
      fileUrl: "/mock/passport.pdf",
    },
    {
      id: SEED_IDS.docInsurance,
      userId: SEED_IDS.traveler,
      tripId: SEED_IDS.trip,
      docType: "insurance",
      title: "Travel Insurance Policy",
      fileUrl: "/mock/insurance.pdf",
      rawText: "Theft of personal belongings is covered up to EUR 1500.",
    },
    {
      id: SEED_IDS.docLouvre,
      userId: SEED_IDS.traveler,
      tripId: SEED_IDS.trip,
      docType: "museum_event",
      title: "Louvre Museum Pass",
      fileUrl: "/mock/louvre.pdf",
      rawText: "Louvre entry 2026-10-13 10:00 code LV-88421",
    },
  ]);

  await db.insert(itineraries).values({
    id: SEED_IDS.itinerary,
    tripId: SEED_IDS.trip,
    userId: SEED_IDS.traveler,
    title: "Paris week",
    status: "active",
  });

  await db.insert(itineraryDays).values([
    {
      id: SEED_IDS.day1,
      itineraryId: SEED_IDS.itinerary,
      dayNumber: 1,
      date: "2026-10-12",
      theme: "Arrival & Marais",
    },
    {
      id: SEED_IDS.day2,
      itineraryId: SEED_IDS.itinerary,
      dayNumber: 2,
      date: "2026-10-13",
      theme: "Art & passages",
    },
  ]);

  await db.insert(itineraryItems).values([
    {
      dayId: SEED_IDS.day1,
      itemType: "activity",
      title: "Arrive CDG → Hotel check-in",
      timeSlot: "14:00",
      locationName: "Le Marais",
    },
    {
      dayId: SEED_IDS.day1,
      itemType: "eat",
      title: "Bistro dinner",
      timeSlot: "19:30",
      locationName: "Chez Janou",
      gemId: SEED_IDS.gem3,
    },
    {
      dayId: SEED_IDS.day2,
      itemType: "activity",
      title: "Louvre morning visit",
      timeSlot: "10:00",
      locationName: "Louvre Museum",
      documentId: SEED_IDS.docLouvre,
    },
    {
      dayId: SEED_IDS.day2,
      itemType: "hidden_gem",
      title: "Covered Passage des Panoramas",
      timeSlot: "16:00",
      locationName: "2nd Arrondissement",
      gemId: SEED_IDS.gem1,
    },
    {
      dayId: SEED_IDS.day2,
      itemType: "drink",
      title: "Natural wine bar",
      timeSlot: "20:00",
      locationName: "Septime Cave",
      gemId: SEED_IDS.gem2,
    },
  ]);

  console.log("Seed complete. Stable IDs:", SEED_IDS);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
