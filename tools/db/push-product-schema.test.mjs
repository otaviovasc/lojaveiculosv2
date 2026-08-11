import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  billingScopeForeignKeyNames,
  crmScopeForeignKeyNames,
  crmScopeIndexNames,
  pushProductSchema,
} from "./push-product-schema.mjs";

const requireFromDbWorkspace = createRequire(
  new URL("../../packages/db/package.json", import.meta.url),
);
const { getTableConfig } = requireFromDbWorkspace("drizzle-orm/pg-core");

const expectedCrmScopeForeignKeyNames = [
  "crm_connections_store_tenant_fk",
  "provider_events_store_tenant_fk",
  "provider_events_scoped_connection_fk",
  "crm_whatsapp_sessions_scoped_connection_fk",
  "crm_whatsapp_messages_scoped_session_fk",
  "crm_whatsapp_outbound_intents_scoped_connection_fk",
  "crm_whatsapp_outbound_intents_scoped_session_fk",
  "crm_whatsapp_outbound_intents_scoped_message_fk",
  "crm_whatsapp_intervention_ledger_scoped_connection_fk",
  "crm_whatsapp_intervention_ledger_scoped_session_fk",
  "crm_webhook_effect_outbox_scoped_provider_event_fk",
  "crm_webhook_effect_outbox_scoped_connection_fk",
  "crm_webhook_effect_outbox_scoped_session_fk",
  "crm_webhook_effect_outbox_scoped_message_fk",
];

const expectedCrmScopeIndexNames = [
  "stores_id_tenant_unique",
  "crm_connections_scope_id_unique",
  "crm_whatsapp_sessions_scope_connection_id_unique",
  "crm_whatsapp_messages_scope_connection_session_id_unique",
  "provider_events_scope_id_unique",
];

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("product schema push bootstrap", () => {
  it("gates CRM composite foreign keys during the bootstrap push", async () => {
    vi.stubEnv("DRIZZLE_SCOPE_FOREIGN_KEY_BOOTSTRAP", "true");
    vi.resetModules();

    const { crmConnections } =
      await import("../../packages/db/src/schema/crm.ts");
    const { crmWhatsappMessages, crmWhatsappSessions } =
      await import("../../packages/db/src/schema/crmWhatsapp.ts");
    const { crmWhatsappInterventionLedger } =
      await import("../../packages/db/src/schema/crmWhatsappInterventions.ts");
    const { crmWhatsappOutboundIntents } =
      await import("../../packages/db/src/schema/crmWhatsappOutbound.ts");
    const { crmWebhookEffectOutbox, providerEvents } =
      await import("../../packages/db/src/schema/providerEvents.ts");
    const bootstrapForeignKeys = [
      ...foreignKeyNames(crmConnections),
      ...foreignKeyNames(crmWhatsappSessions),
      ...foreignKeyNames(crmWhatsappMessages),
      ...foreignKeyNames(crmWhatsappOutboundIntents),
      ...foreignKeyNames(crmWhatsappInterventionLedger),
      ...foreignKeyNames(providerEvents),
      ...foreignKeyNames(crmWebhookEffectOutbox),
    ];

    for (const foreignKeyName of expectedCrmScopeForeignKeyNames) {
      expect(bootstrapForeignKeys).not.toContain(foreignKeyName);
    }
    expect(crmScopeForeignKeyNames).toEqual(expectedCrmScopeForeignKeyNames);
    expect(crmScopeIndexNames).toEqual(expectedCrmScopeIndexNames);
    expect(indexNames(crmConnections)).toContain(
      "crm_connections_scope_id_unique",
    );
    expect(indexNames(crmWhatsappSessions)).toContain(
      "crm_whatsapp_sessions_scope_connection_id_unique",
    );
    expect(indexNames(crmWhatsappMessages)).toContain(
      "crm_whatsapp_messages_scope_connection_session_id_unique",
    );
    expect(indexNames(providerEvents)).toContain(
      "provider_events_scope_id_unique",
    );
  });

  it("retains CRM composite foreign keys outside bootstrap mode", async () => {
    vi.stubEnv("DRIZZLE_SCOPE_FOREIGN_KEY_BOOTSTRAP", "false");
    vi.resetModules();

    const { crmConnections } =
      await import("../../packages/db/src/schema/crm.ts");
    const { crmWhatsappMessages, crmWhatsappSessions } =
      await import("../../packages/db/src/schema/crmWhatsapp.ts");
    const { crmWhatsappInterventionLedger } =
      await import("../../packages/db/src/schema/crmWhatsappInterventions.ts");
    const { crmWhatsappOutboundIntents } =
      await import("../../packages/db/src/schema/crmWhatsappOutbound.ts");
    const { crmWebhookEffectOutbox, providerEvents } =
      await import("../../packages/db/src/schema/providerEvents.ts");
    const finalForeignKeys = [
      ...foreignKeyNames(crmConnections),
      ...foreignKeyNames(crmWhatsappSessions),
      ...foreignKeyNames(crmWhatsappMessages),
      ...foreignKeyNames(crmWhatsappOutboundIntents),
      ...foreignKeyNames(crmWhatsappInterventionLedger),
      ...foreignKeyNames(providerEvents),
      ...foreignKeyNames(crmWebhookEffectOutbox),
    ];

    expect(finalForeignKeys).toEqual(
      expect.arrayContaining(expectedCrmScopeForeignKeyNames),
    );
  });

  it("gates billing composite foreign keys during the bootstrap push", async () => {
    vi.stubEnv("DRIZZLE_SCOPE_FOREIGN_KEY_BOOTSTRAP", "true");
    vi.resetModules();

    const {
      billingAddonContracts,
      billingProviderReconciliations,
      payments,
      subscriptionItems,
      subscriptions,
    } = await import("../../packages/db/src/schema/billing.ts");

    const bootstrapForeignKeys = [
      ...foreignKeyNames(billingProviderReconciliations),
      ...foreignKeyNames(billingAddonContracts),
    ];
    for (const foreignKeyName of billingScopeForeignKeyNames) {
      expect(bootstrapForeignKeys).not.toContain(foreignKeyName);
    }
    expect(indexNames(subscriptions)).toContain(
      "subscriptions_id_tenant_unique",
    );
    expect(indexNames(subscriptionItems)).toContain(
      "subscription_items_scoped_identity_unique",
    );
    expect(indexNames(payments)).toContain("payments_scoped_identity_unique");
  });

  it("retains billing composite foreign keys outside bootstrap mode", async () => {
    vi.stubEnv("DRIZZLE_SCOPE_FOREIGN_KEY_BOOTSTRAP", "false");
    vi.resetModules();

    const { billingAddonContracts, billingProviderReconciliations } =
      await import("../../packages/db/src/schema/billing.ts");
    const finalForeignKeys = [
      ...foreignKeyNames(billingProviderReconciliations),
      ...foreignKeyNames(billingAddonContracts),
    ];

    expect(finalForeignKeys).toEqual(
      expect.arrayContaining(billingScopeForeignKeyNames),
    );
  });

  it("installs every scoped parent index before restoring final foreign keys", async () => {
    const events = [];

    await pushProductSchema({
      detachScopeForeignKeys: async () => events.push("detach-foreign-keys"),
      ensureAutomationScopeIndexes: async () =>
        events.push("ensure-automation-indexes"),
      ensureBillingScopeIndexes: async () =>
        events.push("ensure-billing-indexes"),
      ensureCrmScopeIndexes: async () => events.push("ensure-crm-indexes"),
      ensureFinancingScopeIndexes: async () =>
        events.push("ensure-financing-indexes"),
      installCrmWhatsappSessionIdentityParity: async () =>
        events.push("install-crm-parity"),
      installFinanceAutoEntryParity: async () =>
        events.push("install-finance-parity"),
      installFiscalCatalogParity: async () =>
        events.push("install-fiscal-parity"),
      installScopeForeignKeys: async () => events.push("install-foreign-keys"),
      readAutomationTableState: async () => ({ count: 0, expected: 3 }),
      runDrizzlePush: () => events.push("drizzle-bootstrap"),
      verifyBootstrapState: async () => events.push("verify-bootstrap"),
      verifyFinalState: async () => events.push("verify-final"),
    });

    expect(events).toEqual([
      "drizzle-bootstrap",
      "install-crm-parity",
      "install-finance-parity",
      "install-fiscal-parity",
      "ensure-automation-indexes",
      "ensure-crm-indexes",
      "ensure-financing-indexes",
      "ensure-billing-indexes",
      "verify-bootstrap",
      "install-foreign-keys",
      "verify-final",
    ]);
  });

  it("restores billing parent keys before foreign keys after a failed push", async () => {
    const events = [];
    const pushFailure = new Error("drizzle failed");
    let stateReadCount = 0;

    await expect(
      pushProductSchema({
        ensureAutomationScopeIndexes: async () =>
          events.push("ensure-automation-indexes"),
        ensureBillingScopeIndexes: async () =>
          events.push("ensure-billing-indexes"),
        ensureCrmScopeIndexes: async () => events.push("ensure-crm-indexes"),
        ensureFinancingScopeIndexes: async () =>
          events.push("ensure-financing-indexes"),
        installScopeForeignKeys: async () =>
          events.push("install-foreign-keys"),
        readAutomationTableState: async () => {
          stateReadCount += 1;
          return stateReadCount === 1
            ? { count: 0, expected: 3 }
            : { count: 3, expected: 3 };
        },
        runDrizzlePush: async () => {
          events.push("drizzle-bootstrap");
          throw pushFailure;
        },
      }),
    ).rejects.toBe(pushFailure);
    expect(events).toEqual([
      "drizzle-bootstrap",
      "ensure-automation-indexes",
      "ensure-crm-indexes",
      "ensure-financing-indexes",
      "ensure-billing-indexes",
      "install-foreign-keys",
    ]);
  });
});

function indexNames(table) {
  return getTableConfig(table).indexes.map(({ config }) => config.name);
}

function foreignKeyNames(table) {
  return getTableConfig(table).foreignKeys.map((foreignKey) =>
    foreignKey.getName(),
  );
}
