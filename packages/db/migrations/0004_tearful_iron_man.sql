ALTER TYPE "public"."document_kind" ADD VALUE 'consignment_contract' BEFORE 'internal';--> statement-breakpoint
ALTER TYPE "public"."document_kind" ADD VALUE 'warranty_certificate';--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "clerk_user_id" DROP NOT NULL;
