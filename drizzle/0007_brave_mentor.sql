CREATE TYPE "public"."doc_kind" AS ENUM('file', 'url');--> statement-breakpoint
ALTER TABLE "document_versions" ALTER COLUMN "drive_file_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "document_versions" ADD COLUMN "doc_kind" "doc_kind" DEFAULT 'file' NOT NULL;--> statement-breakpoint
ALTER TABLE "document_versions" ADD COLUMN "external_url" text;