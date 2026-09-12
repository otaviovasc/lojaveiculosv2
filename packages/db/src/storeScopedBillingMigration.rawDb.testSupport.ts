import postgres from "postgres";

export async function createLegacyTables(sql: postgres.TransactionSql) {
  await sql.unsafe(`
    SET LOCAL search_path = pg_temp, public;
    CREATE TEMP TABLE stores (id uuid PRIMARY KEY, tenant_id uuid NOT NULL, is_deleted boolean NOT NULL DEFAULT false, deleted_at timestamptz, UNIQUE (id, tenant_id));
    CREATE TEMP TABLE plans (id uuid PRIMARY KEY, catalog_version text NOT NULL, code text NOT NULL, status text NOT NULL, published_at timestamptz NOT NULL);
    CREATE TEMP TABLE plan_features (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), plan_id uuid NOT NULL, feature_key text NOT NULL, included integer NOT NULL);
    CREATE TEMP TABLE subscriptions (id uuid PRIMARY KEY, billing_customer_id uuid NOT NULL, current_period_end timestamptz, current_period_start timestamptz, provider text NOT NULL, provider_subscription_id text, provider_lifecycle_event_id text, provider_lifecycle_observed_at timestamptz, status text NOT NULL, tenant_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
    CREATE UNIQUE INDEX subscriptions_id_tenant_unique ON subscriptions (id, tenant_id);
    CREATE TEMP TABLE subscription_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), item_type text NOT NULL, plan_id uuid, addon_id uuid, quantity integer NOT NULL DEFAULT 1, starts_at timestamptz, ends_at timestamptz, store_id uuid, subscription_id uuid NOT NULL, tenant_id uuid NOT NULL, unit_amount_cents integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (id, subscription_id, tenant_id, store_id));
    CREATE TEMP TABLE billing_plan_hires (id uuid PRIMARY KEY, subscription_id uuid NOT NULL, effective_subscription_item_id uuid, tenant_id uuid NOT NULL, store_id uuid NOT NULL, provider text NOT NULL, provider_subscription_id text, provider_payment_id text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TEMP TABLE payments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), external_reference text, provider_payment_id text, subscription_id uuid, store_id uuid, tenant_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
    CREATE UNIQUE INDEX payments_scoped_identity_unique ON payments (id, subscription_id, tenant_id);
    CREATE TEMP TABLE billing_checkout_sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), plan_hire_id uuid, external_reference text, subscription_id uuid NOT NULL, store_id uuid, tenant_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TEMP TABLE billing_addon_contracts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), subscription_item_id uuid NOT NULL, activated_by_payment_id uuid, subscription_id uuid NOT NULL, store_id uuid NOT NULL, tenant_id uuid NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
    CREATE TEMP TABLE billing_provider_reconciliations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), attempt_count integer NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz, kind text NOT NULL, last_error text, processing_started_at timestamptz, processing_token uuid, status text NOT NULL, subscription_id uuid NOT NULL, tenant_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
    CREATE UNIQUE INDEX billing_provider_reconciliations_kind_subscription_unique ON billing_provider_reconciliations (kind, subscription_id);
    CREATE TEMP TABLE store_entitlements (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ends_at timestamptz, feature_key text NOT NULL, metadata jsonb NOT NULL DEFAULT '{}', source text NOT NULL, starts_at timestamptz, status text NOT NULL, store_id uuid NOT NULL, tenant_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (store_id, feature_key));
    CREATE TEMP TABLE store_entitlement_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id text, feature_key text NOT NULL, metadata jsonb NOT NULL DEFAULT '{}', next_status text NOT NULL, previous_status text, reason text, source text NOT NULL, store_id uuid NOT NULL, tenant_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
  `);
}

export function openDatabase() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  return postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
}
