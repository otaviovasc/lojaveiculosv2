import { readFileSync } from "node:fs";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  billingProductEventName,
  billingProductEventOutbox,
  billingProductEventOutboxStatus,
} from "./index.js";

const migration = readFileSync(
  new URL(
    "../migrations/0072_billing_product_event_outbox.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();
const deliveryMigration = readFileSync(
  new URL(
    "../migrations/0074_billing_product_event_delivery.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();
const requeueMigration = readFileSync(
  new URL(
    "../migrations/0077_billing_product_event_requeue.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();

describe("billing product event outbox schema", () => {
  it("allowlists billing lifecycle product outcomes", () => {
    expect(billingProductEventName.enumValues).toEqual([
      "hire_created",
      "checkout_created",
      "payment_observed",
      "provider_bound",
      "contract_activated",
      "grace_entered",
      "free_fallback",
      "reconciliation_failed",
    ]);
    expect(billingProductEventOutboxStatus.enumValues).toEqual([
      "pending",
      "processed",
      "failed",
    ]);
  });

  it("keeps a minimal scoped and idempotent delivery envelope", () => {
    const config = getTableConfig(billingProductEventOutbox);
    const columns = config.columns.map(({ name }) => name);

    expect(columns).toEqual(
      expect.arrayContaining([
        "event_name",
        "idempotency_key",
        "tenant_id",
        "store_id",
        "request_id",
        "requeue_count",
        "hire_id",
        "provider_checkout_id",
        "provider_subscription_id",
        "provider_payment_id",
        "provider_event_id",
        "properties",
        "status",
        "occurred_at",
        "last_attempt_at",
        "lease_expires_at",
        "lease_token",
        "next_attempt_at",
      ]),
    );
    expect(columns).not.toEqual(
      expect.arrayContaining([
        "actor_id",
        "email",
        "phone",
        "provider_payload",
        "raw",
        "secret",
        "token",
      ]),
    );
    expect(config.indexes.map((index) => index.config.name)).toContain(
      "billing_product_event_outbox_idempotency_unique",
    );
  });

  it("enforces tenant/store/hire scope and bounds sanitized properties", () => {
    const config = getTableConfig(billingProductEventOutbox);

    expect(config.foreignKeys.map((key) => key.getName())).toEqual(
      expect.arrayContaining([
        "billing_product_event_outbox_store_tenant_fk",
        "billing_product_event_outbox_hire_scope_fk",
      ]),
    );
    expect(config.checks.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        "billing_product_event_outbox_hire_store_check",
        "billing_product_event_outbox_attempt_count_check",
        "billing_product_event_outbox_properties_check",
        "billing_product_event_outbox_lease_pair_check",
        "billing_product_event_outbox_requeue_count_check",
      ]),
    );
    expect(migration).toContain('octet_length("properties"::text) <= 4096');
    expect(migration).not.toContain("provider_payload");
    expect(deliveryMigration).toContain('"next_attempt_at" set not null');
    expect(deliveryMigration).toContain(
      '"billing_product_event_outbox_lease_pair_check"',
    );
    expect(requeueMigration).toContain('"requeue_count" integer default 0');
    expect(requeueMigration).toContain(
      '"billing_product_event_outbox_requeue_count_check"',
    );
  });
});
