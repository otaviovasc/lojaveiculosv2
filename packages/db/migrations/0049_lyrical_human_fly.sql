ALTER TABLE "integration_jobs" ADD COLUMN "provider_operation_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "integration_jobs" ADD COLUMN "provider_operation_token_ciphertext" text;--> statement-breakpoint
ALTER TABLE "integration_jobs" ADD COLUMN "reconciliation_attempt_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "integration_jobs" ADD COLUMN "reconciliation_last_checked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "integration_jobs" ADD COLUMN "reconciliation_lease_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "integration_jobs" ADD COLUMN "reconciliation_lease_owner" varchar(191);--> statement-breakpoint
ALTER TABLE "integration_jobs" ADD COLUMN "reconciliation_next_attempt_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "integration_jobs_reconciliation_due_idx" ON "integration_jobs" USING btree ("tenant_id","store_id","reconciliation_next_attempt_at","reconciliation_lease_expires_at") WHERE "integration_jobs"."status" = 'submitted';--> statement-breakpoint
ALTER TABLE "integration_jobs" ADD CONSTRAINT "integration_jobs_reconciliation_lease_consistent" CHECK ((
        ("integration_jobs"."reconciliation_lease_owner" IS NULL AND "integration_jobs"."reconciliation_lease_expires_at" IS NULL)
        OR ("integration_jobs"."status" = 'submitted' AND "integration_jobs"."reconciliation_lease_owner" IS NOT NULL AND "integration_jobs"."reconciliation_lease_expires_at" IS NOT NULL)
      ));