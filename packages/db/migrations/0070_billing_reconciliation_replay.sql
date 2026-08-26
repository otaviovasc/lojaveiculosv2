-- PostgreSQL requires enum values added by 0069 to be committed before this
-- migration can use them. Drizzle executes all pending migrations in one
-- transaction, so establish the boundary after both the 0069 schema changes
-- and its migration-ledger insert are durable.
COMMIT;--> statement-breakpoint
BEGIN;--> statement-breakpoint

UPDATE "billing_provider_reconciliations"
SET "kind" = 'zapi_retirement', "updated_at" = now()
WHERE "kind" = 'zapi_cancellation' AND "status" <> 'succeeded';

INSERT INTO "billing_provider_reconciliations" (
  "kind", "status", "subscription_id", "tenant_id"
)
SELECT 'zapi_retirement', 'queued', s."id", s."tenant_id"
FROM "subscriptions" s
WHERE s."provider" = 'asaas'
  AND s."provider_subscription_id" IS NOT NULL
  AND EXISTS (
  SELECT 1 FROM "subscription_items" si
  JOIN "addons" a ON a."id" = si."addon_id"
  WHERE si."subscription_id" = s."id" AND a."code" = 'crm_zapi'
)
ON CONFLICT ("kind", "subscription_id") DO NOTHING;

-- The v3 cutover retires every feature add-on, not only Z-API. Subscriptions
-- that never carried Z-API still need their existing provider recurrence and
-- unpaid charges recalculated. Keep them separate from zapi_retirement so the
-- transition ledger and audit evidence retain the actual retirement reason.
INSERT INTO "billing_provider_reconciliations" (
  "kind", "status", "subscription_id", "tenant_id"
)
SELECT 'catalog_migration', 'queued', s."id", s."tenant_id"
FROM "subscriptions" s
WHERE s."provider" = 'asaas'
  AND s."provider_subscription_id" IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM "subscription_items" si
    WHERE si."subscription_id" = s."id" AND si."addon_id" IS NOT NULL
  )
  AND NOT EXISTS (
    SELECT 1 FROM "subscription_items" si
    JOIN "addons" a ON a."id" = si."addon_id"
    WHERE si."subscription_id" = s."id" AND a."code" = 'crm_zapi'
  )
ON CONFLICT ("kind", "subscription_id") DO UPDATE SET
  "available_at" = now(),
  "completed_at" = NULL,
  "last_error" = NULL,
  "processing_started_at" = NULL,
  "processing_token" = NULL,
  "status" = 'queued',
  "updated_at" = now()
WHERE "billing_provider_reconciliations"."status" = 'succeeded';

UPDATE "provider_events"
SET "status" = 'pending_reconciliation', "processed_at" = NULL, "updated_at" = now()
WHERE "provider" = 'asaas' AND "status" = 'ignored';
