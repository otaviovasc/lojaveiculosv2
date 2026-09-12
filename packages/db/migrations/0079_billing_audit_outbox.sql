CREATE TABLE IF NOT EXISTS "billing_audit_outbox" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "action" varchar(120) NOT NULL,
  "actor_id" varchar(191) NOT NULL,
  "actor_kind" varchar(24) NOT NULL,
  "attempt_count" integer DEFAULT 0 NOT NULL,
  "audit_id" uuid NOT NULL,
  "delivered_at" timestamp with time zone,
  "entity_id" uuid NOT NULL,
  "entity_type" varchar(80) NOT NULL,
  "failure_code" varchar(120),
  "idempotency_key" varchar(191) NOT NULL,
  "lease_expires_at" timestamp with time zone,
  "lease_token" varchar(191),
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
  "occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
  "request_id" varchar(191) NOT NULL,
  "state" varchar(24) DEFAULT 'pending' NOT NULL,
  "store_id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL,
  CONSTRAINT "billing_audit_outbox_actor_kind_check"
    CHECK ("actor_kind" IN ('integration', 'public', 'system', 'user')),
  CONSTRAINT "billing_audit_outbox_state_check"
    CHECK ("state" IN ('pending', 'delivering', 'delivered', 'dead_letter')),
  CONSTRAINT "billing_audit_outbox_attempt_count_check"
    CHECK ("attempt_count" >= 0),
  CONSTRAINT "billing_audit_outbox_lease_pair_check"
    CHECK (("lease_token" IS NULL) = ("lease_expires_at" IS NULL)),
  CONSTRAINT "billing_audit_outbox_metadata_check"
    CHECK (jsonb_typeof("metadata") = 'object' AND octet_length("metadata"::text) <= 2048),
  CONSTRAINT "billing_audit_outbox_store_fk"
    FOREIGN KEY ("store_id") REFERENCES "stores"("id"),
  CONSTRAINT "billing_audit_outbox_tenant_fk"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id"),
  CONSTRAINT "billing_audit_outbox_store_tenant_fk"
    FOREIGN KEY ("store_id", "tenant_id") REFERENCES "stores"("id", "tenant_id")
);

ALTER TABLE "billing_audit_outbox"
  DROP CONSTRAINT IF EXISTS "billing_audit_outbox_action_check";
ALTER TABLE "billing_audit_outbox"
  ADD CONSTRAINT "billing_audit_outbox_action_check"
  CHECK ("action" IN (
    'billing.plan_hire.activated',
    'billing.plan_hire.created',
    'billing.plan_hire.checkout_created',
    'billing.plan_quote.approved',
    'billing.plan_quote.requested',
    'billing.subscription.free_fallback'
  ));

CREATE UNIQUE INDEX IF NOT EXISTS "billing_audit_outbox_audit_id_unique"
  ON "billing_audit_outbox" ("audit_id");
CREATE UNIQUE INDEX IF NOT EXISTS "billing_audit_outbox_idempotency_unique"
  ON "billing_audit_outbox" ("idempotency_key");
CREATE INDEX IF NOT EXISTS "billing_audit_outbox_claim_idx"
  ON "billing_audit_outbox" ("state", "next_attempt_at", "lease_expires_at");
