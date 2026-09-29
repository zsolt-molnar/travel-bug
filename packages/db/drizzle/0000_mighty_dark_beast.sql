CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "document_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"chunk_content" text NOT NULL,
	"embedding" vector(1536),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hidden_gems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operator_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"category" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"location_lat" numeric(10, 8),
	"location_lng" numeric(11, 8),
	"neighborhood" varchar(100),
	"tags" text[],
	"embedding" vector(1536),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "itineraries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "itinerary_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"itinerary_id" uuid NOT NULL,
	"day_number" integer NOT NULL,
	"date" date NOT NULL,
	"theme" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "itinerary_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day_id" uuid NOT NULL,
	"item_type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"time_slot" varchar(50),
	"location_name" varchar(255),
	"location_lat" numeric(10, 8),
	"location_lng" numeric(11, 8),
	"gem_id" uuid,
	"is_customized" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"brand_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"destination" varchar(255) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"trip_id" uuid NOT NULL,
	"doc_type" varchar(50) NOT NULL,
	"file_url" text NOT NULL,
	"raw_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operator_id" uuid,
	"email" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'traveler' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_document_id_user_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."user_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hidden_gems" ADD CONSTRAINT "hidden_gems_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itineraries" ADD CONSTRAINT "itineraries_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itineraries" ADD CONSTRAINT "itineraries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_days" ADD CONSTRAINT "itinerary_days_itinerary_id_itineraries_id_fk" FOREIGN KEY ("itinerary_id") REFERENCES "public"."itineraries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_items" ADD CONSTRAINT "itinerary_items_day_id_itinerary_days_id_fk" FOREIGN KEY ("day_id") REFERENCES "public"."itinerary_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_items" ADD CONSTRAINT "itinerary_items_gem_id_hidden_gems_id_fk" FOREIGN KEY ("gem_id") REFERENCES "public"."hidden_gems"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_documents" ADD CONSTRAINT "user_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_documents" ADD CONSTRAINT "user_documents_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_doc_chunks_embedding" ON "document_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "idx_gems_embedding" ON "hidden_gems" USING hnsw ("embedding" vector_cosine_ops);