ALTER TABLE "crm_channel_connections"
  ADD COLUMN IF NOT EXISTS "phone_number" text;

DROP INDEX IF EXISTS "crm_channel_connections_zapi_store_current_unique";

CREATE UNIQUE INDEX IF NOT EXISTS "crm_channel_connections_whatsapp_phone_store_unique"
  ON "crm_channel_connections" ("tenant_id", "store_id", "channel", "phone_number")
  WHERE "channel" = 'whatsapp'
    AND "state" <> 'archived'
    AND "phone_number" IS NOT NULL;

ALTER TABLE "crm_channel_connections"
  DROP CONSTRAINT IF EXISTS "crm_channel_connections_supported_triple_check";

ALTER TABLE "crm_channel_connections"
  ADD CONSTRAINT "crm_channel_connections_supported_triple_check"
  CHECK (
    ("channel" = 'whatsapp' AND "provider" = 'meta_cloud' AND "broker" = 'composio')
    OR ("channel" = 'instagram' AND "provider" = 'meta_cloud' AND "broker" = 'composio')
    OR ("channel" = 'whatsapp' AND "provider" = 'zapi' AND "broker" = 'direct')
    OR ("channel" = 'whatsapp' AND "provider" = 'uazapi' AND "broker" = 'direct')
    OR ("channel" = 'olx_chat' AND "provider" = 'olx' AND "broker" = 'direct')
  );

CREATE TABLE IF NOT EXISTS "crm_channel_connection_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "connection_id" uuid NOT NULL,
  "granted_by" uuid,
  "store_id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  CONSTRAINT "crm_channel_connection_members_connection_fk"
    FOREIGN KEY ("connection_id")
    REFERENCES "crm_channel_connections" ("id")
    ON DELETE CASCADE,
  CONSTRAINT "crm_channel_connection_members_granted_by_fk"
    FOREIGN KEY ("granted_by")
    REFERENCES "users" ("id"),
  CONSTRAINT "crm_channel_connection_members_user_fk"
    FOREIGN KEY ("user_id")
    REFERENCES "users" ("id"),
  CONSTRAINT "crm_channel_connection_members_store_tenant_fk"
    FOREIGN KEY ("store_id", "tenant_id")
    REFERENCES "stores" ("id", "tenant_id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "crm_channel_connection_members_connection_user_unique"
  ON "crm_channel_connection_members" ("connection_id", "user_id");

CREATE INDEX IF NOT EXISTS "crm_channel_connection_members_store_user_idx"
  ON "crm_channel_connection_members" ("store_id", "user_id");
