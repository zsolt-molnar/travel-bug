CREATE TABLE "invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"operator_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"code" varchar(64) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invites_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "trip_travelers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trip_travelers_trip_user" UNIQUE("trip_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "itinerary_items" ADD COLUMN "document_id" uuid;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "operator_id" uuid;--> statement-breakpoint
ALTER TABLE "user_documents" ADD COLUMN "title" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "name" varchar(255);--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_travelers" ADD CONSTRAINT "trip_travelers_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_travelers" ADD CONSTRAINT "trip_travelers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE set null ON UPDATE no action;