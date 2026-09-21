CREATE TYPE "public"."cadence" AS ENUM('monthly', 'quarterly', 'biannual', 'annual', 'once');--> statement-breakpoint
CREATE TABLE "action_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" integer NOT NULL,
	"seq" integer NOT NULL,
	"title" text NOT NULL,
	"responsible" text,
	"qp_ref" text,
	"category" text,
	"cadence" "cadence" NOT NULL,
	"lead_days" integer DEFAULT 7 NOT NULL,
	"notify_user_id" uuid,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "action_occurrences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"period_label" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reminded_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"completed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_occurrence" UNIQUE("item_id","period_label")
);
--> statement-breakpoint
ALTER TABLE "action_items" ADD CONSTRAINT "action_items_notify_user_id_users_id_fk" FOREIGN KEY ("notify_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_occurrences" ADD CONSTRAINT "action_occurrences_item_id_action_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."action_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_occurrences" ADD CONSTRAINT "action_occurrences_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_occurrence_due" ON "action_occurrences" USING btree ("due_date","status");