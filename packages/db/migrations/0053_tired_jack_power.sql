CREATE TYPE "public"."crm_bot_routing_mode" AS ENUM('disabled', 'inherit_store_default', 'explicit_connection');--> statement-breakpoint
CREATE TYPE "public"."crm_routing_channel" AS ENUM('whatsapp', 'instagram', 'olx_chat');--> statement-breakpoint
CREATE TABLE "crm_channel_routing_policies" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"bot_connection_id" uuid,
	"bot_mode" "crm_bot_routing_mode" DEFAULT 'disabled' NOT NULL,
	"channel" "crm_routing_channel" NOT NULL,
	"default_connection_id" uuid,
	"store_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	CONSTRAINT "crm_channel_routing_policies_bot_mode_consistent" CHECK (("crm_channel_routing_policies"."bot_mode" = 'explicit_connection' and "crm_channel_routing_policies"."bot_connection_id" is not null) or ("crm_channel_routing_policies"."bot_mode" <> 'explicit_connection' and "crm_channel_routing_policies"."bot_connection_id" is null))
);
--> statement-breakpoint
ALTER TABLE "crm_channel_routing_policies" ADD CONSTRAINT "crm_channel_routing_policies_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_channel_routing_policies" ADD CONSTRAINT "crm_channel_routing_policies_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_channel_routing_policies" ADD CONSTRAINT "crm_channel_routing_policies_store_tenant_fk" FOREIGN KEY ("store_id","tenant_id") REFERENCES "public"."stores"("id","tenant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_channel_routing_policies" ADD CONSTRAINT "crm_channel_routing_policies_default_connection_fk" FOREIGN KEY ("tenant_id","store_id","default_connection_id") REFERENCES "public"."provider_connections"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_channel_routing_policies" ADD CONSTRAINT "crm_channel_routing_policies_bot_connection_fk" FOREIGN KEY ("tenant_id","store_id","bot_connection_id") REFERENCES "public"."provider_connections"("tenant_id","store_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "crm_channel_routing_policies_scope_channel_unique" ON "crm_channel_routing_policies" USING btree ("tenant_id","store_id","channel");--> statement-breakpoint
CREATE INDEX "crm_channel_routing_policies_default_connection_idx" ON "crm_channel_routing_policies" USING btree ("default_connection_id");--> statement-breakpoint
CREATE INDEX "crm_channel_routing_policies_bot_connection_idx" ON "crm_channel_routing_policies" USING btree ("bot_connection_id");--> statement-breakpoint
INSERT INTO "crm_channel_routing_policies" ("tenant_id", "store_id", "channel", "bot_mode")
SELECT store."tenant_id", store."id", channel."value"::"crm_routing_channel", 'disabled'::"crm_bot_routing_mode"
FROM "stores" store
CROSS JOIN (VALUES ('whatsapp'), ('instagram'), ('olx_chat')) AS channel("value")
ON CONFLICT ("tenant_id", "store_id", "channel") DO NOTHING;
--> statement-breakpoint
-- Existing canonical rows created during CRM cutover may only carry the legacy
-- identity. Populate missing readiness evidence from the legacy connection
-- without overwriting canonical capability or health snapshots already present.
WITH legacy_readiness AS (
  SELECT
    legacy."id",
    legacy."tenant_id",
    legacy."store_id",
    CASE
      WHEN legacy."status" <> 'active' THEN false
      WHEN legacy."provider" = 'zapi'
        THEN coalesce(legacy."metadata" #>> ARRAY['webhookSetup', 'status'], '') = 'configured'
      WHEN legacy."provider" = 'olx_chat'
        THEN coalesce(legacy."metadata" #>> ARRAY['webhookSetup', 'capabilities', 'chat', 'status'], '') = 'active'
      WHEN legacy."provider"::text LIKE 'composio_%'
        THEN coalesce(nullif(btrim(legacy."external_connection_id"), ''), '') <> ''
          OR coalesce(nullif(btrim(legacy."credentials_ref" #>> ARRAY['composio', 'connectedAccountId']), ''), '') <> ''
      ELSE false
    END AS ready
  FROM "crm_connections" legacy
)
UPDATE "provider_connections" canonical
SET "metadata" = canonical."metadata"
  || jsonb_build_object('legacyConnectionId', readiness."id")
  || CASE
    WHEN canonical."metadata" ? 'connected' THEN '{}'::jsonb
    ELSE jsonb_build_object('connected', readiness.ready)
  END
  || CASE
    WHEN canonical."metadata" ? 'capabilities' THEN '{}'::jsonb
    ELSE jsonb_build_object(
      'capabilities', jsonb_build_object(
        'inbound', readiness.ready,
        'outbound', readiness.ready,
        'templates', readiness.ready AND canonical."channel" = 'whatsapp' AND canonical."provider" = 'meta_cloud'
      )
    )
  END
FROM legacy_readiness readiness
WHERE canonical."id" = readiness."id"
  AND canonical."tenant_id" = readiness."tenant_id"
  AND canonical."store_id" = readiness."store_id";
--> statement-breakpoint
-- Preserve an existing store's usable default only when there is exactly one
-- evidenced outbound-capable connection for that channel. Multiple providers
-- remain unset so the store must choose explicitly.
WITH eligible AS (
  SELECT
    "tenant_id",
    "store_id",
    "channel",
    min("id"::text)::uuid AS "connection_id"
  FROM "provider_connections"
  WHERE "state" = 'active'
    AND "metadata" ->> 'connected' = 'true'
    AND "metadata" ->> 'degraded' IS DISTINCT FROM 'true'
    AND "metadata" #>> ARRAY['capabilities', 'outbound'] = 'true'
  GROUP BY "tenant_id", "store_id", "channel"
  HAVING count(*) = 1
)
UPDATE "crm_channel_routing_policies" policy
SET "default_connection_id" = eligible."connection_id"
FROM eligible
WHERE policy."tenant_id" = eligible."tenant_id"
  AND policy."store_id" = eligible."store_id"
  AND policy."channel"::text = eligible."channel"::text
  AND policy."default_connection_id" IS NULL;
