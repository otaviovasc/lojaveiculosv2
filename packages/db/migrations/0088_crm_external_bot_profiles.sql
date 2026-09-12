CREATE TABLE "crm_external_bot_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "api_token_hash" varchar(64),
  "enabled" boolean DEFAULT false NOT NULL,
  "is_default" boolean DEFAULT false NOT NULL,
  "name" varchar(160) NOT NULL,
  "secret_updated_at" timestamp with time zone,
  "store_id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL,
  "webhook_secret_hash" varchar(71),
  "webhook_secret_sealed" text,
  "webhook_url" varchar(500)
);
--> statement-breakpoint
ALTER TABLE "crm_external_bot_profiles"
  ADD CONSTRAINT "crm_external_bot_profiles_store_tenant_fk"
  FOREIGN KEY ("store_id", "tenant_id") REFERENCES "stores"("id", "tenant_id");
--> statement-breakpoint
ALTER TABLE "crm_external_bot_profiles"
  ADD CONSTRAINT "crm_external_bot_profiles_secret_consistency_check"
  CHECK (("webhook_secret_hash" IS NULL AND "webhook_secret_sealed" IS NULL)
    OR ("webhook_secret_hash" IS NOT NULL AND "webhook_secret_sealed" IS NOT NULL));
--> statement-breakpoint
ALTER TABLE "crm_external_bot_profiles"
  ADD CONSTRAINT "crm_external_bot_profiles_enabled_requires_delivery_check"
  CHECK ((NOT "enabled") OR ("webhook_url" IS NOT NULL AND "webhook_secret_hash" IS NOT NULL AND "webhook_secret_sealed" IS NOT NULL));
--> statement-breakpoint
CREATE UNIQUE INDEX "crm_external_bot_profiles_scope_id_unique"
  ON "crm_external_bot_profiles" ("tenant_id", "store_id", "id");
--> statement-breakpoint
CREATE UNIQUE INDEX "crm_external_bot_profiles_default_unique"
  ON "crm_external_bot_profiles" ("tenant_id", "store_id")
  WHERE "is_default" = true;
--> statement-breakpoint
CREATE INDEX "crm_external_bot_profiles_store_idx"
  ON "crm_external_bot_profiles" ("tenant_id", "store_id");
--> statement-breakpoint
INSERT INTO "crm_external_bot_profiles"
  ("id", "created_at", "updated_at", "api_token_hash", "enabled", "is_default",
   "name", "secret_updated_at", "store_id", "tenant_id",
   "webhook_secret_hash", "webhook_secret_sealed", "webhook_url")
SELECT
  account."id", account."created_at", account."updated_at",
  NULLIF(account."config" ->> 'externalBotApiBearerHash', ''),
  (account."status" = 'active'
    AND account."config" ->> 'webhookUrl' IS NOT NULL
    AND account."config" ->> 'webhookSecretHash' IS NOT NULL
    AND account."config" ->> 'webhookSecretSealed' IS NOT NULL),
  true,
  'Default bot',
  NULLIF(account."config" ->> 'secretUpdatedAt', '')::timestamptz,
  account."store_id", account."tenant_id",
  NULLIF(account."config" ->> 'webhookSecretHash', ''),
  NULLIF(account."config" ->> 'webhookSecretSealed', ''),
  NULLIF(account."config" ->> 'webhookUrl', '')
FROM "integration_accounts" account
WHERE account."provider" = 'crm_external_bot'
  AND account."archived_at" IS NULL;
--> statement-breakpoint
ALTER TABLE "crm_channel_connections"
  ADD COLUMN "external_bot_profile_id" uuid;
--> statement-breakpoint
ALTER TABLE "crm_channel_connections"
  ADD CONSTRAINT "crm_channel_connections_external_bot_profile_fk"
  FOREIGN KEY ("tenant_id", "store_id", "external_bot_profile_id")
  REFERENCES "crm_external_bot_profiles"("tenant_id", "store_id", "id");
