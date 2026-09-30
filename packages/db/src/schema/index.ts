import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
  vector,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

/**
 * Schema for Phase 5 (auth + real data models).
 * Embeddings use vector(1536) for OpenAI text-embedding-3-small (unused until §9).
 */

export const operators = pgTable('operators', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  brandConfig: jsonb('brand_config').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/** Roles: superadmin | agency_manager | agency_agent | traveler */
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  operatorId: uuid('operator_id').references(() => operators.id, {
    onDelete: 'cascade',
  }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  passwordHash: varchar('password_hash', { length: 255 }),
  role: varchar('role', { length: 50 }).default('traveler').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const travelerProfiles = pgTable('traveler_profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  firstName: varchar('first_name', { length: 255 }).notNull(),
  lastName: varchar('last_name', { length: 255 }).notNull(),
  address: varchar('address', { length: 512 }),
  city: varchar('city', { length: 255 }),
  country: varchar('country', { length: 255 }),
  phone: varchar('phone', { length: 64 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/** kind: country | region | city | area */
export const places = pgTable('places', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  kind: varchar('kind', { length: 50 }).notNull(),
  parentId: uuid('parent_id').references((): AnyPgColumn => places.id, {
    onDelete: 'cascade',
  }),
  lat: numeric('lat', { precision: 10, scale: 8 }),
  lng: numeric('lng', { precision: 11, scale: 8 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const trips = pgTable('trips', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  operatorId: uuid('operator_id').references(() => operators.id, {
    onDelete: 'set null',
  }),
  title: varchar('title', { length: 255 }).notNull().default(''),
  destination: varchar('destination', { length: 255 }).notNull(),
  destinationPlaceId: uuid('destination_place_id').references(() => places.id, {
    onDelete: 'set null',
  }),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const tripTravelers = pgTable(
  'trip_travelers',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique('trip_travelers_trip_user').on(t.tripId, t.userId)],
);

export const invites = pgTable('invites', {
  id: uuid('id').defaultRandom().primaryKey(),
  tripId: uuid('trip_id')
    .notNull()
    .references(() => trips.id, { onDelete: 'cascade' }),
  operatorId: uuid('operator_id')
    .notNull()
    .references(() => operators.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  code: varchar('code', { length: 64 }).notNull().unique(),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const hiddenGems = pgTable(
  'hidden_gems',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    operatorId: uuid('operator_id').references(() => operators.id, {
      onDelete: 'cascade',
    }),
    placeId: uuid('place_id')
      .notNull()
      .references(() => places.id, { onDelete: 'restrict' }),
    title: varchar('title', { length: 255 }).notNull(),
    category: varchar('category', { length: 100 }).notNull(),
    description: text('description').notNull(),
    locationLat: numeric('location_lat', { precision: 10, scale: 8 }),
    locationLng: numeric('location_lng', { precision: 11, scale: 8 }),
    neighborhood: varchar('neighborhood', { length: 100 }),
    tags: text('tags').array(),
    embedding: vector('embedding', { dimensions: 1536 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_gems_embedding').using('hnsw', table.embedding.op('vector_cosine_ops')),
  ],
);

export const userDocuments = pgTable('user_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tripId: uuid('trip_id')
    .notNull()
    .references(() => trips.id, { onDelete: 'cascade' }),
  docType: varchar('doc_type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }),
  fileUrl: text('file_url').notNull(),
  rawText: text('raw_text'),
  extractedData: jsonb('extracted_data').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/** Agency one-way trip board. kind: alert | info | notice */
export const tripMessages = pgTable(
  'trip_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tripId: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    authorUserId: uuid('author_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: varchar('kind', { length: 50 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('idx_trip_messages_trip_created').on(table.tripId, table.createdAt)],
);

/** In-app traveler notifications. type: trip_message | vault_document */
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    body: text('body').notNull(),
    tripId: uuid('trip_id').references(() => trips.id, { onDelete: 'cascade' }),
    messageId: uuid('message_id').references(() => tripMessages.id, {
      onDelete: 'cascade',
    }),
    documentId: uuid('document_id').references(() => userDocuments.id, {
      onDelete: 'cascade',
    }),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_notifications_user_read_created').on(
      table.userId,
      table.readAt,
      table.createdAt,
    ),
  ],
);

export const itineraries = pgTable('itineraries', {
  id: uuid('id').defaultRandom().primaryKey(),
  tripId: uuid('trip_id')
    .notNull()
    .references(() => trips.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const itineraryDays = pgTable('itinerary_days', {
  id: uuid('id').defaultRandom().primaryKey(),
  itineraryId: uuid('itinerary_id')
    .notNull()
    .references(() => itineraries.id, { onDelete: 'cascade' }),
  dayNumber: integer('day_number').notNull(),
  date: date('date').notNull(),
  theme: varchar('theme', { length: 255 }),
  placeId: uuid('place_id').references(() => places.id, { onDelete: 'set null' }),
});

export const itineraryItems = pgTable('itinerary_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  dayId: uuid('day_id')
    .notNull()
    .references(() => itineraryDays.id, { onDelete: 'cascade' }),
  itemType: varchar('item_type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  timeSlot: varchar('time_slot', { length: 50 }),
  locationName: varchar('location_name', { length: 255 }),
  locationLat: numeric('location_lat', { precision: 10, scale: 8 }),
  locationLng: numeric('location_lng', { precision: 11, scale: 8 }),
  gemId: uuid('gem_id').references(() => hiddenGems.id, { onDelete: 'set null' }),
  documentId: uuid('document_id').references(() => userDocuments.id, {
    onDelete: 'set null',
  }),
  sortOrder: integer('sort_order').default(0).notNull(),
  isCustomized: boolean('is_customized').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const documentChunks = pgTable(
  'document_chunks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => userDocuments.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    chunkContent: text('chunk_content').notNull(),
    embedding: vector('embedding', { dimensions: 1536 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_doc_chunks_embedding').using(
      'hnsw',
      table.embedding.op('vector_cosine_ops'),
    ),
  ],
);
