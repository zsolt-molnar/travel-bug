CREATE TABLE "places" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"kind" varchar(50) NOT NULL,
	"parent_id" uuid,
	"lat" numeric(10, 8),
	"lng" numeric(11, 8),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "traveler_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255) NOT NULL,
	"address" varchar(512),
	"city" varchar(255),
	"country" varchar(255),
	"phone" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "traveler_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "hidden_gems" ALTER COLUMN "operator_id" DROP NOT NULL;--> statement-breakpoint
DELETE FROM "itinerary_items";--> statement-breakpoint
DELETE FROM "hidden_gems";--> statement-breakpoint
ALTER TABLE "hidden_gems" ADD COLUMN "place_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "itinerary_days" ADD COLUMN "place_id" uuid;--> statement-breakpoint
ALTER TABLE "itinerary_items" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "title" varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "destination_place_id" uuid;--> statement-breakpoint
ALTER TABLE "user_documents" ADD COLUMN "extracted_data" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" varchar(255);--> statement-breakpoint
ALTER TABLE "places" ADD CONSTRAINT "places_parent_id_places_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "traveler_profiles" ADD CONSTRAINT "traveler_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hidden_gems" ADD CONSTRAINT "hidden_gems_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_days" ADD CONSTRAINT "itinerary_days_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_items" ADD CONSTRAINT "itinerary_items_document_id_user_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."user_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_destination_place_id_places_id_fk" FOREIGN KEY ("destination_place_id") REFERENCES "public"."places"("id") ON DELETE set null ON UPDATE no action;
