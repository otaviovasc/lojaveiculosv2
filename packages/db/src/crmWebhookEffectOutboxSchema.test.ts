import { readFileSync } from "node:fs";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  crmWebhookEffectOutbox,
  crmWebhookEffectStatus,
  providerEvents,
} from "./index.js";

const recoveryMigration = readFileSync(
  new URL(
    "../migrations/0026_durable_olx_webhook_effects.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("CRM webhook effect outbox schema", () => {
  it("keeps provider replay scoped and each durable effect unique", () => {
    const providerIndexes = getTableConfig(providerEvents).indexes.map(
      (index) => index.config.name,
    );
    const effectIndexes = getTableConfig(crmWebhookEffectOutbox).indexes.map(
      (index) => index.config.name,
    );

    expect(providerIndexes).toEqual(
      expect.arrayContaining([
        "provider_events_provider_connection_event_unique",
        "provider_events_provider_unscoped_event_unique",
      ]),
    );
    expect(effectIndexes).toContain(
      "crm_webhook_effect_outbox_event_type_unique",
    );
  });

  it("enforces scope through provider events and durable effects", () => {
    const providers = getTableConfig(providerEvents);
    const effects = getTableConfig(crmWebhookEffectOutbox);

    expect(providers.checks.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        "provider_events_scope_complete_check",
        "provider_events_connection_scope_check",
      ]),
    );
    expect(providers.foreignKeys.map((key) => key.getName())).toEqual(
      expect.arrayContaining([
        "provider_events_store_tenant_fk",
        "provider_events_scoped_connection_fk",
      ]),
    );
    expect(effects.foreignKeys.map((key) => key.getName())).toContain(
      "crm_webhook_effect_outbox_scoped_provider_event_fk",
    );
  });

  it("persists due retry and terminal dead-letter state", () => {
    const config = getTableConfig(crmWebhookEffectOutbox);
    const columns = config.columns.map(({ name }) => name);

    expect(crmWebhookEffectStatus.enumValues).toContain("dead_letter");
    expect(columns).toEqual(
      expect.arrayContaining(["dead_lettered_at", "next_attempt_at"]),
    );
    expect(recoveryMigration).toContain('UPDATE "provider_events" AS "event"');
    expect(recoveryMigration).toContain(
      '"crm_webhook_effect_outbox_scoped_provider_event_fk"',
    );
  });
});
