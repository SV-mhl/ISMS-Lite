ALTER TABLE "document_versions" ADD COLUMN "version_major" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "document_versions" ADD COLUMN "version_minor" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "effective_version_id" uuid;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "checked_out_by" uuid;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "checked_out_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_checked_out_by_users_id_fk" FOREIGN KEY ("checked_out_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;