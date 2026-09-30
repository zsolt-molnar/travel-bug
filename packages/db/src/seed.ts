import { config } from 'dotenv';
import { resolve } from 'node:path';
import { hashSync } from 'bcryptjs';
import { count, sql } from 'drizzle-orm';
import { createDb } from './client';
import { SEED_IDS, SEED_PASSWORD } from './seed-ids';
import {
  hiddenGems,
  invites,
  itineraries,
  itineraryDays,
  itineraryItems,
  notifications,
  operators,
  places,
  travelerProfiles,
  tripMessages,
  tripTravelers,
  trips,
  userDocuments,
  users,
} from './schema';

config({ path: resolve(__dirname, '../../../.env') });

/** When set, skip truncate+seed if any users already exist. */
const ifEmpty = process.argv.includes('--if-empty');

async function seed() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is required');
  const db = createDb(url);
  const passwordHash = hashSync(SEED_PASSWORD, 10);

  if (ifEmpty) {
    const [row] = await db.select({ value: count() }).from(users);
    if (Number(row?.value ?? 0) > 0) {
      console.log(
        'DB already has data — skipping seed (run `pnpm db:seed` to wipe + reseed).',
      );
      await db.$client.end({ timeout: 5 });
      process.exit(0);
    }
    console.log('DB empty — loading demo seed…');
  }

  await db.execute(sql`TRUNCATE TABLE
    document_chunks,
    itinerary_items,
    itinerary_days,
    itineraries,
    notifications,
    trip_messages,
    user_documents,
    invites,
    trip_travelers,
    trips,
    hidden_gems,
    traveler_profiles,
    places,
    users,
    operators
    CASCADE`);

  await db.insert(operators).values({
    id: SEED_IDS.operator,
    name: 'Wanderlust Pro',
    brandConfig: { primaryColor: '#0d5c63', logo: null },
  });

  await db.insert(users).values([
    {
      id: SEED_IDS.superadmin,
      email: 'superadmin@travelbug.demo',
      name: 'Super Admin',
      role: 'superadmin',
      operatorId: null,
      passwordHash,
    },
    {
      id: SEED_IDS.agencyManager,
      email: 'manager@wanderlust.pro',
      name: 'Ada Manager',
      role: 'agency_manager',
      operatorId: SEED_IDS.operator,
      passwordHash,
    },
    {
      id: SEED_IDS.agencyAgent,
      email: 'agent@wanderlust.pro',
      name: 'Alex Agent',
      role: 'agency_agent',
      operatorId: SEED_IDS.operator,
      passwordHash,
    },
    {
      id: SEED_IDS.travelerIndependent,
      email: 'solo@travelbug.demo',
      name: 'Indie Traveler',
      role: 'traveler',
      operatorId: null,
      passwordHash,
    },
    {
      id: SEED_IDS.travelerAgency,
      email: 'client@wanderlust.pro',
      name: 'Agency Client',
      role: 'traveler',
      operatorId: SEED_IDS.operator,
      passwordHash,
    },
    {
      id: SEED_IDS.traveler,
      email: 'traveler@travelbug.demo',
      name: 'Demo Traveler',
      role: 'traveler',
      operatorId: null,
      passwordHash,
    },
  ]);

  await db.insert(travelerProfiles).values([
    {
      id: SEED_IDS.profileIndependent,
      userId: SEED_IDS.travelerIndependent,
      firstName: 'Indie',
      lastName: 'Rivers',
      address: '12 Harbor Lane',
      city: 'Lisbon',
      country: 'Portugal',
      phone: '+351-910-000-001',
    },
    {
      id: SEED_IDS.profileAgency,
      userId: SEED_IDS.travelerAgency,
      firstName: 'Casey',
      lastName: 'Client',
      address: '88 Market Street',
      city: 'Berlin',
      country: 'Germany',
      phone: '+49-170-000-002',
    },
  ]);

  await db.insert(places).values([
    { id: SEED_IDS.placeFrance, name: 'France', kind: 'country' },
    {
      id: SEED_IDS.placeParis,
      name: 'Paris',
      kind: 'city',
      parentId: SEED_IDS.placeFrance,
      lat: '48.85660000',
      lng: '2.35220000',
    },
    {
      id: SEED_IDS.placeMarais,
      name: 'Le Marais',
      kind: 'area',
      parentId: SEED_IDS.placeParis,
      lat: '48.85750000',
      lng: '2.35880000',
    },
    {
      id: SEED_IDS.placeSaintGermain,
      name: 'Saint-Germain',
      kind: 'area',
      parentId: SEED_IDS.placeParis,
      lat: '48.85340000',
      lng: '2.33310000',
    },
    {
      id: SEED_IDS.placeMontmartre,
      name: 'Montmartre',
      kind: 'area',
      parentId: SEED_IDS.placeParis,
      lat: '48.88670000',
      lng: '2.34310000',
    },
    { id: SEED_IDS.placeJapan, name: 'Japan', kind: 'country' },
    {
      id: SEED_IDS.placeTokyo,
      name: 'Tokyo',
      kind: 'city',
      parentId: SEED_IDS.placeJapan,
      lat: '35.67620000',
      lng: '139.65030000',
    },
    {
      id: SEED_IDS.placeShibuya,
      name: 'Shibuya',
      kind: 'area',
      parentId: SEED_IDS.placeTokyo,
      lat: '35.65950000',
      lng: '139.70040000',
    },
    { id: SEED_IDS.placeItaly, name: 'Italy', kind: 'country' },
    {
      id: SEED_IDS.placeRome,
      name: 'Rome',
      kind: 'city',
      parentId: SEED_IDS.placeItaly,
      lat: '41.90280000',
      lng: '12.49640000',
    },
    {
      id: SEED_IDS.placeTrastevere,
      name: 'Trastevere',
      kind: 'area',
      parentId: SEED_IDS.placeRome,
      lat: '41.88970000',
      lng: '12.46950000',
    },
  ]);

  await db.insert(trips).values([
    {
      id: SEED_IDS.trip,
      userId: SEED_IDS.travelerIndependent,
      operatorId: null,
      title: 'Solo Paris Escape',
      destination: 'Paris, France',
      destinationPlaceId: SEED_IDS.placeParis,
      startDate: '2026-10-12',
      endDate: '2026-10-18',
    },
    {
      id: SEED_IDS.tripAgencyParis,
      userId: SEED_IDS.travelerAgency,
      operatorId: SEED_IDS.operator,
      title: 'Wanderlust Paris VIP',
      destination: 'Paris, France',
      destinationPlaceId: SEED_IDS.placeParis,
      startDate: '2026-10-12',
      endDate: '2026-10-18',
    },
    {
      id: SEED_IDS.tripTokyo,
      userId: SEED_IDS.travelerAgency,
      operatorId: SEED_IDS.operator,
      title: 'Wanderlust Tokyo Week',
      destination: 'Tokyo, Japan',
      destinationPlaceId: SEED_IDS.placeTokyo,
      startDate: '2026-11-03',
      endDate: '2026-11-10',
    },
  ]);

  await db.insert(tripTravelers).values([
    { tripId: SEED_IDS.trip, userId: SEED_IDS.travelerIndependent },
    { tripId: SEED_IDS.tripAgencyParis, userId: SEED_IDS.travelerAgency },
    { tripId: SEED_IDS.tripTokyo, userId: SEED_IDS.travelerAgency },
  ]);

  await db.insert(invites).values({
    id: SEED_IDS.invite,
    tripId: SEED_IDS.tripAgencyParis,
    operatorId: SEED_IDS.operator,
    email: 'pending.client@example.com',
    code: 'PARIS-VIP',
    status: 'pending',
  });

  await db.insert(hiddenGems).values([
    {
      id: SEED_IDS.gem1,
      operatorId: null,
      placeId: SEED_IDS.placeSaintGermain,
      title: 'Passage des Panoramas',
      category: 'activity',
      description: 'Historic covered passage with old print shops and cafés.',
      locationLat: '48.87100000',
      locationLng: '2.34150000',
      neighborhood: 'Saint-Germain',
      tags: ['quiet', 'local', 'covered'],
    },
    {
      id: SEED_IDS.gem2,
      operatorId: SEED_IDS.operator,
      placeId: SEED_IDS.placeMarais,
      title: 'Septime Cave',
      category: 'drink',
      description: 'Natural wine bar beloved by locals.',
      locationLat: '48.85380000',
      locationLng: '2.38050000',
      neighborhood: 'Le Marais',
      tags: ['wine', 'local'],
    },
    {
      id: SEED_IDS.gem3,
      operatorId: null,
      placeId: SEED_IDS.placeMarais,
      title: 'Chez Janou',
      category: 'eat',
      description: 'Provençal bistro in the Marais with legendary chocolate mousse.',
      locationLat: '48.85720000',
      locationLng: '2.36510000',
      neighborhood: 'Le Marais',
      tags: ['bistro', 'classic'],
    },
    {
      id: SEED_IDS.gem4,
      operatorId: null,
      placeId: SEED_IDS.placeShibuya,
      title: 'Nonbei Yokocho',
      category: 'drink',
      description: 'Tiny alley of standing bars near Shibuya station.',
      locationLat: '35.65980000',
      locationLng: '139.70220000',
      neighborhood: 'Shibuya',
      tags: ['nightlife', 'local'],
    },
    {
      id: SEED_IDS.gem5,
      operatorId: SEED_IDS.operator,
      placeId: SEED_IDS.placeShibuya,
      title: 'Meiji Jingu Outer Gardens stroll',
      category: 'activity',
      description: 'Quiet paths and seasonal ginkgo trees near Harajuku.',
      locationLat: '35.67020000',
      locationLng: '139.70280000',
      neighborhood: 'Shibuya',
      tags: ['park', 'calm'],
    },
  ]);

  await db.insert(userDocuments).values([
    {
      id: SEED_IDS.docPassport,
      userId: SEED_IDS.travelerIndependent,
      tripId: SEED_IDS.trip,
      docType: 'passport',
      title: 'EU Passport',
      fileUrl: 'http://localhost:3001/uploads/seed-passport.pdf',
      extractedData: {},
    },
    {
      id: SEED_IDS.docInsurance,
      userId: SEED_IDS.travelerIndependent,
      tripId: SEED_IDS.trip,
      docType: 'insurance',
      title: 'Travel Insurance Policy',
      fileUrl: 'http://localhost:3001/uploads/seed-insurance.pdf',
      rawText: 'Theft of personal belongings is covered up to EUR 1500.',
      extractedData: { coverageEur: 1500, type: 'theft' },
    },
    {
      id: SEED_IDS.docLouvre,
      userId: SEED_IDS.travelerIndependent,
      tripId: SEED_IDS.trip,
      docType: 'museum_event',
      title: 'Louvre Museum Pass',
      fileUrl: 'http://localhost:3001/uploads/seed-louvre.pdf',
      rawText: 'Louvre entry 2026-10-13 10:00 code LV-88421',
      extractedData: { venue: 'Louvre', code: 'LV-88421', time: '10:00' },
    },
    {
      id: SEED_IDS.docAgencyBoarding,
      userId: SEED_IDS.travelerAgency,
      tripId: SEED_IDS.tripAgencyParis,
      docType: 'flight',
      title: 'CDG → ORY boarding pass',
      fileUrl: 'http://localhost:3001/uploads/seed-agency-boarding.pdf',
      extractedData: {},
    },
  ]);

  await db.insert(itineraries).values([
    {
      id: SEED_IDS.itinerary,
      tripId: SEED_IDS.trip,
      userId: SEED_IDS.travelerIndependent,
      title: 'Paris week',
      status: 'active',
    },
    {
      id: SEED_IDS.itineraryAgencyParis,
      tripId: SEED_IDS.tripAgencyParis,
      userId: SEED_IDS.travelerAgency,
      title: 'Paris VIP week',
      status: 'active',
    },
    {
      id: SEED_IDS.itineraryTokyo,
      tripId: SEED_IDS.tripTokyo,
      userId: SEED_IDS.travelerAgency,
      title: 'Tokyo agency week',
      status: 'active',
    },
  ]);

  await db.insert(itineraryDays).values([
    {
      id: SEED_IDS.day1,
      itineraryId: SEED_IDS.itinerary,
      dayNumber: 1,
      date: '2026-10-12',
      theme: 'Arrival & Marais',
      placeId: SEED_IDS.placeMarais,
    },
    {
      id: SEED_IDS.day2,
      itineraryId: SEED_IDS.itinerary,
      dayNumber: 2,
      date: '2026-10-13',
      theme: 'Art & passages',
      placeId: SEED_IDS.placeSaintGermain,
    },
    {
      id: SEED_IDS.dayAgencyParis1,
      itineraryId: SEED_IDS.itineraryAgencyParis,
      dayNumber: 1,
      date: '2026-10-12',
      theme: 'Marais welcome',
      placeId: SEED_IDS.placeMarais,
    },
    {
      id: SEED_IDS.dayTokyo1,
      itineraryId: SEED_IDS.itineraryTokyo,
      dayNumber: 1,
      date: '2026-11-03',
      theme: 'Shibuya arrival',
      placeId: SEED_IDS.placeShibuya,
    },
  ]);

  await db.insert(itineraryItems).values([
    {
      dayId: SEED_IDS.day1,
      itemType: 'activity',
      title: 'Arrive CDG → Hotel check-in',
      timeSlot: '14:00',
      locationName: 'Le Marais',
      sortOrder: 0,
    },
    {
      dayId: SEED_IDS.day1,
      itemType: 'eat',
      title: 'Bistro dinner',
      timeSlot: '19:30',
      locationName: 'Chez Janou',
      gemId: SEED_IDS.gem3,
      sortOrder: 1,
    },
    {
      dayId: SEED_IDS.day2,
      itemType: 'activity',
      title: 'Louvre morning visit',
      timeSlot: '10:00',
      locationName: 'Louvre Museum',
      documentId: SEED_IDS.docLouvre,
      sortOrder: 0,
    },
    {
      dayId: SEED_IDS.day2,
      itemType: 'hidden_gem',
      title: 'Covered Passage des Panoramas',
      timeSlot: '16:00',
      locationName: 'Saint-Germain',
      gemId: SEED_IDS.gem1,
      sortOrder: 1,
    },
    {
      dayId: SEED_IDS.dayAgencyParis1,
      itemType: 'eat',
      title: 'Chez Janou welcome dinner',
      timeSlot: '20:00',
      locationName: 'Le Marais',
      gemId: SEED_IDS.gem3,
      sortOrder: 0,
    },
    {
      dayId: SEED_IDS.dayTokyo1,
      itemType: 'drink',
      title: 'Nonbei Yokocho nightcap',
      timeSlot: '21:00',
      locationName: 'Shibuya',
      gemId: SEED_IDS.gem4,
      sortOrder: 0,
    },
  ]);

  await db.insert(tripMessages).values([
    {
      id: SEED_IDS.msgTokyoWelcome,
      tripId: SEED_IDS.tripTokyo,
      authorUserId: SEED_IDS.agencyManager,
      kind: 'info',
      title: 'Welcome to Tokyo',
      body: 'Your guide will meet you at Shibuya Scramble at 09:00 on day 1. Safe travels!',
    },
    {
      id: SEED_IDS.msgTokyoAlert,
      tripId: SEED_IDS.tripTokyo,
      authorUserId: SEED_IDS.agencyAgent,
      kind: 'alert',
      title: 'Typhoon watch',
      body: 'Light rain expected mid-week. Pack a compact umbrella; outdoor stops may shift indoors.',
    },
  ]);

  await db.insert(notifications).values([
    {
      id: SEED_IDS.notifTokyoWelcome,
      userId: SEED_IDS.travelerAgency,
      type: 'trip_message',
      title: 'Welcome to Tokyo',
      body: 'Your guide will meet you at Shibuya Scramble at 09:00 on day 1. Safe travels!',
      tripId: SEED_IDS.tripTokyo,
      messageId: SEED_IDS.msgTokyoWelcome,
    },
    {
      id: SEED_IDS.notifTokyoAlert,
      userId: SEED_IDS.travelerAgency,
      type: 'trip_message',
      title: 'Typhoon watch',
      body: 'Light rain expected mid-week. Pack a compact umbrella; outdoor stops may shift indoors.',
      tripId: SEED_IDS.tripTokyo,
      messageId: SEED_IDS.msgTokyoAlert,
    },
    {
      id: SEED_IDS.notifAgencyBoarding,
      userId: SEED_IDS.travelerAgency,
      type: 'vault_document',
      title: 'New vault document',
      body: 'CDG → ORY boarding pass was added to your Paris VIP vault.',
      tripId: SEED_IDS.tripAgencyParis,
      documentId: SEED_IDS.docAgencyBoarding,
    },
  ]);

  console.log('Seed complete. Demo password:', SEED_PASSWORD);
  console.log('Stable IDs:', SEED_IDS);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
