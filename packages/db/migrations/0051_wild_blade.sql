ALTER TABLE "integration_jobs" ADD COLUMN "dispatch_lease_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "integration_jobs" ADD COLUMN "dispatch_lease_owner" varchar(191);--> statement-breakpoint
UPDATE "integration_jobs"
SET "status" = 'submitted',
    "metadata" = "metadata" || jsonb_build_object(
      'reconciliationRequired', true,
      'recoveryReason', 'dispatch_lease_migration'
    ),
    "provider_operation_expires_at" = NULL,
    "provider_operation_token_ciphertext" = NULL,
    "reconciliation_lease_expires_at" = NULL,
    "reconciliation_lease_owner" = NULL,
    "reconciliation_next_attempt_at" = NULL,
    "updated_at" = now()
WHERE "status" = 'running';--> statement-breakpoint
CREATE INDEX "integration_jobs_stale_dispatch_idx" ON "integration_jobs" USING btree ("tenant_id","store_id","dispatch_lease_expires_at") WHERE "integration_jobs"."status" = 'running';--> statement-breakpoint
ALTER TABLE "integration_jobs" ADD CONSTRAINT "integration_jobs_dispatch_lease_consistent" CHECK ((
        ("integration_jobs"."status" = 'running' AND "integration_jobs"."dispatch_lease_owner" IS NOT NULL AND "integration_jobs"."dispatch_lease_expires_at" IS NOT NULL)
        OR ("integration_jobs"."status" <> 'running' AND "integration_jobs"."dispatch_lease_owner" IS NULL AND "integration_jobs"."dispatch_lease_expires_at" IS NULL)
      ));
