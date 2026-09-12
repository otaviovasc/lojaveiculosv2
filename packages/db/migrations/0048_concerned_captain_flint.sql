ALTER TYPE "public"."integration_job_status" RENAME TO "integration_job_status_legacy";--> statement-breakpoint
CREATE TYPE "public"."integration_job_status" AS ENUM('queued', 'running', 'submitted', 'succeeded', 'failed', 'cancelled');--> statement-breakpoint
ALTER TABLE "integration_jobs" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "integration_jobs" ALTER COLUMN "status" TYPE "public"."integration_job_status" USING "status"::text::"public"."integration_job_status";--> statement-breakpoint
ALTER TABLE "integration_jobs" ALTER COLUMN "status" SET DEFAULT 'queued';--> statement-breakpoint
DROP TYPE "public"."integration_job_status_legacy";
