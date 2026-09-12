CREATE TYPE "public"."billing_quota_usage_reservation_status" AS ENUM(
  'reserved',
  'succeeded',
  'provider_failed',
  'released'
);--> statement-breakpoint

CREATE TABLE "billing_quota_usage_reservations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "failure_code" varchar(120),
  "finalized_at" timestamp with time zone,
  "period_start" timestamp with time zone NOT NULL,
  "provider" varchar(80) NOT NULL,
  "provider_call_started_at" timestamp with time zone,
  "quota_key" varchar(80) NOT NULL,
  "request_id" varchar(191),
  "status" "billing_quota_usage_reservation_status" DEFAULT 'reserved' NOT NULL,
  "store_id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL,
  CONSTRAINT "billing_quota_usage_reservations_key_check"
    CHECK ("quota_key" = 'plate_lookup'),
  CONSTRAINT "billing_quota_usage_reservations_period_check"
    CHECK (
      "period_start" =
        date_trunc('month', "period_start" AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
    ),
  CONSTRAINT "billing_quota_usage_reservations_finalization_check"
    CHECK (
      ("status" = 'reserved' AND "finalized_at" IS NULL)
      OR ("status" <> 'reserved' AND "finalized_at" IS NOT NULL)
    ),
  CONSTRAINT "billing_quota_usage_reservations_provider_start_check"
    CHECK (
      "status" = 'reserved'
      OR ("status" = 'released' AND "provider_call_started_at" IS NULL)
      OR (
        "status" IN ('succeeded', 'provider_failed')
        AND "provider_call_started_at" IS NOT NULL
      )
    )
);--> statement-breakpoint

ALTER TABLE "billing_quota_usage_reservations"
  ADD CONSTRAINT "billing_quota_usage_reservations_store_id_stores_id_fk"
  FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id")
  ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "billing_quota_usage_reservations"
  ADD CONSTRAINT "billing_quota_usage_reservations_tenant_id_tenants_id_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id")
  ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "billing_quota_usage_reservations"
  ADD CONSTRAINT "billing_quota_usage_reservations_store_tenant_fk"
  FOREIGN KEY ("store_id", "tenant_id")
  REFERENCES "public"."stores"("id", "tenant_id")
  ON DELETE no action ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "billing_quota_usage_reservations_scope_period_idx"
  ON "billing_quota_usage_reservations"
  USING btree ("tenant_id", "store_id", "quota_key", "period_start", "status");
