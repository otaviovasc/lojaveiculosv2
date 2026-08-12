CREATE TABLE IF NOT EXISTS "crm_retention_legal_holds" (
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "store_id" uuid NOT NULL REFERENCES "stores"("id"),
  "category" varchar(40),
  "resource_type" varchar(80),
  "resource_id" uuid,
  "reason" text NOT NULL,
  "starts_at" timestamptz DEFAULT now() NOT NULL,
  "expires_at" timestamptz,
  "released_at" timestamptz,
  CONSTRAINT "crm_retention_legal_holds_store_tenant_fk" FOREIGN KEY ("store_id", "tenant_id") REFERENCES "stores"("id", "tenant_id"),
  CONSTRAINT "crm_retention_legal_holds_category_check" CHECK ("category" IS NULL OR "category" IN ('canonical_message', 'provider_raw_payload', 'bot_interaction')),
  CONSTRAINT "crm_retention_legal_holds_expiry_check" CHECK ("expires_at" IS NULL OR "expires_at" > "starts_at"),
  CONSTRAINT "crm_retention_legal_holds_target_check" CHECK (("resource_id" IS NULL) = ("resource_type" IS NULL)),
  CONSTRAINT "crm_retention_legal_holds_reason_nonempty" CHECK (btrim("reason") <> '')
);
CREATE INDEX IF NOT EXISTS "crm_retention_legal_holds_active_scope_idx" ON "crm_retention_legal_holds" ("tenant_id", "store_id", "released_at", "expires_at");

CREATE TABLE IF NOT EXISTS "crm_retention_scopes" (
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "store_id" uuid NOT NULL REFERENCES "stores"("id"),
  "cursor" text,
  "next_run_at" timestamptz DEFAULT now() NOT NULL,
  "lease_owner" varchar(191),
  "lease_expires_at" timestamptz,
  "last_started_at" timestamptz,
  "last_completed_at" timestamptz,
  "last_failed_at" timestamptz,
  CONSTRAINT "crm_retention_scopes_store_tenant_fk" FOREIGN KEY ("store_id", "tenant_id") REFERENCES "stores"("id", "tenant_id"),
  CONSTRAINT "crm_retention_scopes_lease_pair_check" CHECK (("lease_owner" IS NULL) = ("lease_expires_at" IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS "crm_retention_scopes_scope_unique" ON "crm_retention_scopes" ("tenant_id", "store_id");
CREATE INDEX IF NOT EXISTS "crm_retention_scopes_claim_idx" ON "crm_retention_scopes" ("next_run_at", "lease_expires_at");
