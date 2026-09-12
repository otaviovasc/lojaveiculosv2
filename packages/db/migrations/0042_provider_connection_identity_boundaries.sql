ALTER TABLE "integration_accounts"
  ADD COLUMN "archived_at" timestamp with time zone,
  ADD COLUMN "provider_account_id" varchar(191);
--> statement-breakpoint
UPDATE "integration_accounts"
SET "provider_account_id" = nullif(btrim("config"->'connection'->>'providerAccountId'), '')
WHERE "provider" = 'olx'
  AND "provider_account_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "integration_accounts"
  ADD CONSTRAINT "integration_accounts_store_tenant_fk"
  FOREIGN KEY ("store_id", "tenant_id")
  REFERENCES "stores" ("id", "tenant_id");
--> statement-breakpoint
DROP INDEX "integration_accounts_store_provider_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX "integration_accounts_store_provider_active_unique"
  ON "integration_accounts" ("store_id", "provider")
  WHERE "archived_at" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "integration_accounts_scope_provider_identity_active_unique"
  ON "integration_accounts" ("tenant_id", "store_id", "provider", "provider_account_id")
  WHERE "archived_at" IS NULL AND "provider_account_id" IS NOT NULL;
--> statement-breakpoint
DROP INDEX "crm_connections_provider_external_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX "crm_connections_provider_external_active_unique"
  ON "crm_connections" ("provider", "external_connection_id")
  WHERE "status" <> 'archived' AND "external_connection_id" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "crm_connections_provider_instance_active_unique"
  ON "crm_connections" ("provider", "external_instance_id")
  WHERE "provider" = 'zapi' AND "status" <> 'archived' AND "external_instance_id" IS NOT NULL;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "guard_crm_connection_provider_identity"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."provider" IS DISTINCT FROM OLD."provider" THEN
    RAISE EXCEPTION 'crm connection provider identity is immutable'
      USING ERRCODE = '23514';
  END IF;

  IF OLD."provider" = 'olx_chat'
     AND OLD."external_connection_id" IS NOT NULL
     AND NEW."external_connection_id" IS DISTINCT FROM OLD."external_connection_id" THEN
    RAISE EXCEPTION 'OLX provider account identity is immutable; archive and replace the connection'
      USING ERRCODE = '23514';
  END IF;

  IF OLD."provider" = 'zapi'
     AND OLD."external_instance_id" IS NOT NULL
     AND NEW."external_instance_id" IS DISTINCT FROM OLD."external_instance_id" THEN
    RAISE EXCEPTION 'Z-API instance identity is immutable; archive and replace the connection'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "crm_connections_provider_identity_immutable"
BEFORE UPDATE ON "crm_connections"
FOR EACH ROW
EXECUTE FUNCTION "guard_crm_connection_provider_identity"();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "guard_integration_account_provider_identity"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."provider" IS DISTINCT FROM OLD."provider" THEN
    RAISE EXCEPTION 'integration account provider is immutable'
      USING ERRCODE = '23514';
  END IF;

  IF OLD."provider_account_id" IS NOT NULL
     AND NEW."provider_account_id" IS DISTINCT FROM OLD."provider_account_id" THEN
    RAISE EXCEPTION 'provider account identity is immutable; archive and replace the authorization'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "integration_accounts_provider_identity_immutable"
BEFORE UPDATE ON "integration_accounts"
FOR EACH ROW
EXECUTE FUNCTION "guard_integration_account_provider_identity"();
