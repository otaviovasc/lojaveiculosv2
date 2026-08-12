CREATE TABLE IF NOT EXISTS "crm_retention_audit_outbox" (
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "store_id" uuid NOT NULL REFERENCES "stores"("id"),
  "audit_id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "idempotency_key" varchar(191) NOT NULL,
  "request_id" varchar(191) NOT NULL,
  "actor_id" varchar(191) NOT NULL,
  "actor_kind" varchar(24) NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "occurred_at" timestamptz DEFAULT now() NOT NULL,
  "state" varchar(24) DEFAULT 'pending' NOT NULL,
  "attempt_count" integer DEFAULT 0 NOT NULL,
  "next_attempt_at" timestamptz DEFAULT now() NOT NULL,
  "lease_owner" varchar(191),
  "lease_expires_at" timestamptz,
  CONSTRAINT "crm_retention_audit_outbox_store_tenant_fk" FOREIGN KEY ("store_id", "tenant_id") REFERENCES "stores"("id", "tenant_id"),
  CONSTRAINT "crm_retention_audit_outbox_actor_kind_check" CHECK ("actor_kind" IN ('integration', 'public', 'system', 'user')),
  CONSTRAINT "crm_retention_audit_outbox_state_check" CHECK ("state" IN ('pending', 'delivering', 'delivered', 'dead_letter')),
  CONSTRAINT "crm_retention_audit_outbox_attempt_nonnegative" CHECK ("attempt_count" >= 0),
  CONSTRAINT "crm_retention_audit_outbox_lease_pair_check" CHECK (("lease_owner" IS NULL) = ("lease_expires_at" IS NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS "crm_retention_audit_outbox_idempotency_unique" ON "crm_retention_audit_outbox" ("idempotency_key");
CREATE UNIQUE INDEX IF NOT EXISTS "crm_retention_audit_outbox_audit_id_unique" ON "crm_retention_audit_outbox" ("audit_id");
CREATE INDEX IF NOT EXISTS "crm_retention_audit_outbox_claim_idx" ON "crm_retention_audit_outbox" ("state", "next_attempt_at", "lease_expires_at");

CREATE OR REPLACE FUNCTION crm_retention_legal_hold_scope_lock()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended(COALESCE(NEW.tenant_id, OLD.tenant_id)::text || ':' || COALESCE(NEW.store_id, OLD.store_id)::text, 7319)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS crm_retention_legal_hold_scope_lock_trigger ON crm_retention_legal_holds;
CREATE TRIGGER crm_retention_legal_hold_scope_lock_trigger
BEFORE INSERT OR UPDATE OR DELETE ON crm_retention_legal_holds
FOR EACH ROW EXECUTE FUNCTION crm_retention_legal_hold_scope_lock();
