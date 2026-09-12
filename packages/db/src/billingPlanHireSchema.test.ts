import { readFileSync } from "node:fs";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  billingCheckoutSessions,
  billingPlanHires,
  billingPlanHireTransitions,
  billingPlanQuotes,
  billingProviderReconciliations,
  subscriptionItems,
  subscriptions,
} from "./index.js";

const migration = readFileSync(
  new URL(
    "../migrations/0069_production_billing_packaging_cutover.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();
const reconciliationMigration = readFileSync(
  new URL(
    "../migrations/0070_billing_reconciliation_replay.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();
const zapiCredentialsMigration = readFileSync(
  new URL(
    "../migrations/0071_zapi_byok_credentials_cutover.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();
const lifecycleMigration = readFileSync(
  new URL(
    "../migrations/0073_billing_lifecycle_monotonicity.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();
const storeScopeMigration = readFileSync(
  new URL(
    "../migrations/0078_store_scoped_billing_subscriptions.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();

describe("billing plan hire schema", () => {
  it("persists quotes, hires, transitions, and checkout correlation", () => {
    expect(getTableConfig(billingPlanQuotes).name).toBe("billing_plan_quotes");
    expect(
      getTableConfig(billingPlanHires).columns.map(({ name }) => name),
    ).toEqual(
      expect.arrayContaining([
        "catalog_version",
        "checkout_mode",
        "effective_subscription_item_id",
        "effective_at",
        "idempotency_key",
        "plan_snapshot",
        "provider_checkout_id",
        "provider_payment_id",
        "provider_subscription_id",
        "quoted_cents",
      ]),
    );
    expect(getTableConfig(billingPlanHireTransitions).name).toBe(
      "billing_plan_hire_transitions",
    );
    expect(
      getTableConfig(billingCheckoutSessions).columns.map(({ name }) => name),
    ).toContain("plan_hire_id");
  });

  it("persists provider ordering and renewal-boundary state", () => {
    expect(
      getTableConfig(subscriptions).columns.map(({ name }) => name),
    ).toEqual(
      expect.arrayContaining([
        "provider_lifecycle_event_id",
        "provider_lifecycle_observed_at",
        "store_id",
      ]),
    );
    expect(lifecycleMigration).toContain(
      "add value if not exists 'free_fallback'",
    );
    expect(lifecycleMigration).toContain(
      'add column if not exists "effective_at"',
    );
    expect(lifecycleMigration).toContain(
      'add column if not exists "provider_lifecycle_observed_at"',
    );
  });

  it("enforces idempotency, provider identity, and scoped relationships", () => {
    const hireConfig = getTableConfig(billingPlanHires);
    const hireIndexes = hireConfig.indexes.map((index) => index.config.name);
    const hireForeignKeys = hireConfig.foreignKeys.map((foreignKey) =>
      foreignKey.getName(),
    );

    expect(hireIndexes).toEqual(
      expect.arrayContaining([
        "billing_plan_hires_store_idempotency_unique",
        "billing_plan_hires_one_open_store_unique",
        "billing_plan_hires_provider_checkout_unique",
        "billing_plan_hires_provider_payment_unique",
      ]),
    );
    expect(hireForeignKeys).toEqual(
      expect.arrayContaining([
        "billing_plan_hires_effective_item_scope_fk",
        "billing_plan_hires_quote_scope_fk",
        "billing_plan_hires_store_tenant_fk",
        "billing_plan_hires_subscription_scope_fk",
      ]),
    );
    expect(
      getTableConfig(billingCheckoutSessions).foreignKeys.map((foreignKey) =>
        foreignKey.getName(),
      ),
    ).toContain("billing_checkout_sessions_plan_hire_scope_fk");
  });

  it("enforces store-scoped recurring contracts and payment identity", () => {
    const subscriptionConfig = getTableConfig(subscriptions);
    expect(
      subscriptionConfig.foreignKeys.map((key) => key.getName()),
    ).toContain("subscriptions_store_tenant_fk");
    expect(
      subscriptionConfig.indexes.map((index) => index.config.name),
    ).toContain("subscriptions_id_tenant_store_unique");
    expect(storeScopeMigration).toContain(
      'create temp table "billing_subscription_store_targets"',
    );
    expect(storeScopeMigration).toContain(
      'constraint "payments_subscription_scope_fk"',
    );
    expect(storeScopeMigration).toContain(
      "add value if not exists 'subscription_cancellation'",
    );
    expect(
      getTableConfig(billingProviderReconciliations).columns.map(
        ({ name }) => name,
      ),
    ).toContain("target_provider_subscription_id");
    expect(storeScopeMigration).toContain(
      'add column if not exists "target_provider_subscription_id" varchar(191)',
    );
    expect(
      getTableConfig(billingProviderReconciliations).indexes.map(
        (index) => index.config.name,
      ),
    ).toEqual(
      expect.arrayContaining([
        "billing_provider_reconciliations_non_target_unique",
        "billing_provider_reconciliations_target_unique",
      ]),
    );
    expect(
      getTableConfig(billingProviderReconciliations).checks.map(
        ({ name }) => name,
      ),
    ).toContain("billing_provider_reconciliations_target_shape_check");
    expect(storeScopeMigration).toMatch(
      /on conflict \("kind", "subscription_id"\)\s+where "target_provider_subscription_id" is null\s+do nothing/,
    );
  });

  it("enforces effective plan row shape and non-overlapping store contracts", () => {
    const itemConfig = getTableConfig(subscriptionItems);

    expect(itemConfig.checks.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        "subscription_items_effective_window_check",
        "subscription_items_type_shape_check",
      ]),
    );
    expect(migration).toContain(
      'constraint "subscription_items_no_overlapping_store_plans"',
    );
    expect(migration).toContain("exclude using gist");
    expect(migration).toContain("where (\"item_type\" = 'plan'");
  });

  it("removes local provider placeholders and retires active Z-API billing", () => {
    expect(migration).toContain(
      'set "provider_customer_id" = null, "updated_at" = now()',
    );
    expect(migration).toContain(
      'set "provider_subscription_id" = null, "updated_at" = now()',
    );
    expect(migration).toContain("where \"feature_key\" = 'crm_zapi'");
    expect(migration).toContain(
      'where "item_type" = \'addon\' and ("ends_at" is null',
    );
  });

  it("commits new enum values before reconciliation uses them", () => {
    expect(migration).toContain(
      "add value if not exists 'pending_reconciliation'",
    );
    expect(migration).toContain("add value if not exists 'zapi_retirement'");
    expect(migration).not.toContain("set \"kind\" = 'zapi_retirement'");
    expect(migration).not.toContain(
      "set \"status\" = 'pending_reconciliation'",
    );
    expect(reconciliationMigration).toContain(
      "set \"kind\" = 'zapi_retirement'",
    );
    expect(reconciliationMigration).toContain(
      "set \"status\" = 'pending_reconciliation'",
    );
    expect(reconciliationMigration).toMatch(
      /^-- postgresql requires enum values[\s\S]*commit;--> statement-breakpoint\s+begin;--> statement-breakpoint/,
    );
  });

  it("queues provider-backed retirement for Z-API and every other add-on", () => {
    expect(reconciliationMigration).toContain(
      "select 'zapi_retirement', 'queued'",
    );
    expect(reconciliationMigration).toContain(
      "select 'catalog_migration', 'queued'",
    );
    expect(reconciliationMigration).toContain(
      's."provider_subscription_id" is not null',
    );
    expect(reconciliationMigration).toContain('si."addon_id" is not null');
    expect(reconciliationMigration).toContain("a.\"code\" = 'crm_zapi'");
  });

  it("redacts Z-API provider identity and marks incomplete credentials", () => {
    expect(zapiCredentialsMigration).toContain(
      'set "external_instance_id" = null',
    );
    expect(zapiCredentialsMigration).toContain(
      'create or replace function "billing_scrub_legacy_zapi_secret_keys"',
    );
    for (const secretKey of [
      "clienttoken",
      "instanceid",
      "instancetoken",
      "webhooksecret",
      "client_token",
      "instance_id",
      "instance_token",
      "webhook_secret",
    ]) {
      expect(zapiCredentialsMigration).toContain(`'${secretKey}'`);
    }
    expect(zapiCredentialsMigration).toContain(
      "'credentialresetrequired', true",
    );
    expect(zapiCredentialsMigration).toContain("'credentials_incomplete'");
    expect(zapiCredentialsMigration).toContain(
      "'webhooksecretstatus', 'rotation_required'",
    );
    expect(zapiCredentialsMigration).toContain('"webhook_url" = null');
    expect(zapiCredentialsMigration).toContain(
      'drop function "billing_scrub_legacy_zapi_secret_keys"(jsonb)',
    );
    expect(zapiCredentialsMigration).toContain(
      'constraint "crm_channel_connections_zapi_instance_redacted_check"',
    );
  });
});
