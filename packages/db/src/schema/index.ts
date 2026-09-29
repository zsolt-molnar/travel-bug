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
} from "drizzle-orm/pg-core";

/**
 * Schema for Working POC (Phases 1–4).
 * Embeddings use vector(1536) for OpenAI text-embedding-3-small (unused until §9).
 */

export const operators = pgTable("operators", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  brandConfig: jsonb("brand_config").default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Roles: superadmin | agency_manager | agency_agent | traveler */
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  operatorId: uuid("operator_id").references(() => operators.id, {
    onDelete: "cascade",
  }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  role: varchar("role", { length: 50 }).default("traveler").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const trips = pgTable("trips", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  operatorId: uuid("operator_id").references(() => operators.id, {
    onDelete: "set null",
  }),
  destination: varchar("destination", { length: 255 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const tripTravelers = pgTable(
  "trip_travelers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tripId: uuid("trip_id")
      .notNull()
      .references(() => trips.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique("trip_travelers_trip_user").on(t.tripId, t.userId)],
);

export const invites = pgTable("invites", {
  id: uuid("id").defaultRandom().primaryKey(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  operatorId: uuid("operator_id")
    .notNull()
    .references(() => operators.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  status: varchar("status", { length: 50 }).default("pending").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const hiddenGems = pgTable(
  "hidden_gems",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    operatorId: uuid("operator_id")
      .notNull()
      .references(() => operators.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    description: text("description").notNull(),
    locationLat: numeric("location_lat", { precision: 10, scale: 8 }),
    locationLng: numeric("location_lng", { precision: 11, scale: 8 }),
    neighborhood: varchar("neighborhood", { length: 100 }),
    tags: text("tags").array(),
    embedding: vector("embedding", { dimensions: 1536 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_gems_embedding").using("hnsw", table.embedding.op("vector_cosine_ops")),
  ],
);

export const itineraries = pgTable("itineraries", {
  id: uuid("id").defaultRandom().primaryKey(),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  status: varchar("status", { length: 50 }).default("active").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const itineraryDays = pgTable("itinerary_days", {
  id: uuid("id").defaultRandom().primaryKey(),
  itineraryId: uuid("itinerary_id")
    .notNull()
    .references(() => itineraries.id, { onDelete: "cascade" }),
  dayNumber: integer("day_number").notNull(),
  date: date("date").notNull(),
  theme: varchar("theme", { length: 255 }),
});

export const itineraryItems = pgTable("itinerary_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  dayId: uuid("day_id")
    .notNull()
    .references(() => itineraryDays.id, { onDelete: "cascade" }),
  itemType: varchar("item_type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  timeSlot: varchar("time_slot", { length: 50 }),
  locationName: varchar("location_name", { length: 255 }),
  locationLat: numeric("location_lat", { precision: 10, scale: 8 }),
  locationLng: numeric("location_lng", { precision: 11, scale: 8 }),
  gemId: uuid("gem_id").references(() => hiddenGems.id, { onDelete: "set null" }),
  documentId: uuid("document_id"),
  isCustomized: boolean("is_customized").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const userDocuments = pgTable("user_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tripId: uuid("trip_id")
    .notNull()
    .references(() => trips.id, { onDelete: "cascade" }),
  docType: varchar("doc_type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }),
  fileUrl: text("file_url").notNull(),
  rawText: text("raw_text"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const documentChunks = pgTable(
  "document_chunks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => userDocuments.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    chunkContent: text("chunk_content").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_doc_chunks_embedding").using(
      "hnsw",
      table.embedding.op("vector_cosine_ops"),
    ),
  ],
);
