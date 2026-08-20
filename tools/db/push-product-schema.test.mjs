import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  billingScopeForeignKeyNames,
  canonicalCrmForeignKeyNames,
  crmScopeForeignKeyNames,
  crmScopeIndexNames,
  pushProductSchema,
} from "./push-product-schema.mjs";

const requireFromDbWorkspace = createRequire(
  new URL("../../packages/db/package.json", import.meta.url),
);
const { getTableConfig } = requireFromDbWorkspace("drizzle-orm/pg-core");

const expectedCrmScopeForeignKeyNames = [
  "crm_tags_scoped_connection_fk",
  "provider_events_store_tenant_fk",
  "provider_events_scoped_connection_fk",
  "crm_webhook_effect_outbox_scoped_provider_event_fk",
  "crm_webhook_effect_outbox_scoped_connection_fk",
  "crm_webhook_effect_outbox_scoped_thread_fk",
  "crm_webhook_effect_outbox_semantic_cycle_fk",
  "crm_webhook_effect_outbox_semantic_message_fk",
  "crm_outbound_intents_scoped_connection_fk",
  "crm_outbound_intents_scoped_thread_fk",
  "crm_outbound_intents_semantic_cycle_fk",
  "crm_outbound_intents_semantic_message_fk",
  "crm_scheduled_messages_scoped_connection_fk",
  "crm_scheduled_messages_scoped_thread_fk",
  "crm_campaigns_scoped_connection_fk",
  "crm_campaign_recipients_scoped_connection_fk",
  "crm_campaign_recipients_scoped_thread_fk",
];

const expectedCanonicalCrmForeignKeyNames = [
  "crm_channel_connections_store_tenant_fk",
  "conversation_threads_store_tenant_fk",
  "conversation_threads_semantic_connection_fk",
  "conversation_cycles_store_tenant_fk",
  "conversation_cycles_scoped_thread_fk",
  "conversation_attendances_store_tenant_fk",
  "conversation_attendances_scoped_thread_fk",
  "conversation_attendances_semantic_cycle_fk",
  "crm_messages_store_tenant_fk",
  "crm_messages_semantic_connection_fk",
  "crm_messages_semantic_thread_fk",
  "crm_messages_semantic_cycle_fk",
  "crm_lead_outcomes_scoped_origin_cycle_fk",
];

const expectedCrmScopeIndexNames = [
  "stores_id_tenant_unique",
  "crm_channel_routing_policies_scope_channel_unique",
  "external_account_authorizations_scope_id_unique",
  "external_account_authorizations_semantic_id_unique",
  "external_account_authorization_capabilities_scope_id_unique",
  "crm_channel_connections_scope_id_unique",
  "conversation_threads_scope_id_unique",
  "conversation_cycles_scope_id_unique",
  "conversation_cycles_thread_id_unique",
  "crm_messages_semantic_id_unique",
  "provider_events_scope_id_unique",
];

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("product schema push bootstrap", () => {
  it("uses the canonical CRM operational tables and attendance relationships", async () => {
    const { crmChannelConnections } =
      await import("../../packages/db/src/schema/crmCore/authorization.ts");
    const { conversationAttendances } =
      await import("../../packages/db/src/schema/crmCore/attendance.ts");
    const { conversationCycles, conversationThreads } =
      await import("../../packages/db/src/schema/crmCore/conversations.ts");
    const { crmMessages } =
      await import("../../packages/db/src/schema/crmCore/messages.ts");
    const { crmLeadOutcomes } =
      await import("../../packages/db/src/schema/crmLeadOutcomes.ts");

    expect([
      tableName(crmChannelConnections),
      tableName(conversationThreads),
      tableName(conversationCycles),
      tableName(conversationAttendances),
      tableName(crmMessages),
    ]).toEqual([
      "crm_channel_connections",
      "crm_conversation_threads",
      "crm_conversation_cycles",
      "crm_conversation_attendances",
      "crm_messages",
    ]);
    expect(foreignKeyNames(conversationAttendances)).toEqual(
      expect.arrayContaining([
        "conversation_attendances_scoped_thread_fk",
        "conversation_attendances_semantic_cycle_fk",
      ]),
    );
    const canonicalForeignKeys = [
      ...foreignKeyNames(crmChannelConnections),
      ...foreignKeyNames(conversationThreads),
      ...foreignKeyNames(conversationCycles),
      ...foreignKeyNames(conversationAttendances),
      ...foreignKeyNames(crmMessages),
      ...foreignKeyNames(crmLeadOutcomes),
    ];
    expect(canonicalCrmForeignKeyNames).toEqual(
      expectedCanonicalCrmForeignKeyNames,
    );
    expect(canonicalForeignKeys).toEqual(
      expect.arrayContaining(expectedCanonicalCrmForeignKeyNames),
    );
  });

  it("gates CRM composite foreign keys during the bootstrap push", async () => {
    vi.stubEnv("DRIZZLE_SCOPE_FOREIGN_KEY_BOOTSTRAP", "true");
    vi.resetModules();

    const { crmTags } = await import("../../packages/db/src/schema/crm.ts");
    const { crmChannelConnections } =
      await import("../../packages/db/src/schema/crmCore/authorization.ts");
    const { conversationCycles, conversationThreads } =
      await import("../../packages/db/src/schema/crmCore/conversations.ts");
    const { crmMessages } =
      await import("../../packages/db/src/schema/crmCore/messages.ts");
    const { crmOutboundIntents } =
      await import("../../packages/db/src/schema/crmOutbound.ts");
    const { crmScheduledMessages } =
      await import("../../packages/db/src/schema/crmScheduled.ts");
    const { crmCampaignRecipients, crmCampaigns } =
      await import("../../packages/db/src/schema/crmCampaigns.ts");
    const { crmWebhookEffectOutbox, providerEvents } =
      await import("../../packages/db/src/schema/providerEvents.ts");
    const bootstrapForeignKeys = [
      ...foreignKeyNames(crmTags),
      ...foreignKeyNames(crmOutboundIntents),
      ...foreignKeyNames(crmScheduledMessages),
      ...foreignKeyNames(crmCampaigns),
      ...foreignKeyNames(crmCampaignRecipients),
      ...foreignKeyNames(providerEvents),
      ...foreignKeyNames(crmWebhookEffectOutbox),
    ];

    for (const foreignKeyName of expectedCrmScopeForeignKeyNames) {
      expect(bootstrapForeignKeys).not.toContain(foreignKeyName);
    }
    expect(crmScopeForeignKeyNames).toEqual(expectedCrmScopeForeignKeyNames);
    expect(crmScopeIndexNames).toEqual(expectedCrmScopeIndexNames);
    expect(indexNames(crmChannelConnections)).toContain(
      "crm_channel_connections_scope_id_unique",
    );
    expect(indexNames(conversationThreads)).toContain(
      "conversation_threads_scope_id_unique",
    );
    expect(indexNames(conversationCycles)).toContain(
      "conversation_cycles_scope_id_unique",
    );
    expect(indexNames(conversationCycles)).toContain(
      "conversation_cycles_thread_id_unique",
    );
    expect(indexNames(crmMessages)).toContain(
      "crm_messages_semantic_id_unique",
    );
    expect(indexNames(providerEvents)).toContain(
      "provider_events_scope_id_unique",
    );
  });

  it("retains CRM composite foreign keys outside bootstrap mode", async () => {
    vi.stubEnv("DRIZZLE_SCOPE_FOREIGN_KEY_BOOTSTRAP", "false");
    vi.resetModules();

    const { crmTags } = await import("../../packages/db/src/schema/crm.ts");
    const { crmOutboundIntents } =
      await import("../../packages/db/src/schema/crmOutbound.ts");
    const { crmScheduledMessages } =
      await import("../../packages/db/src/schema/crmScheduled.ts");
    const { crmCampaignRecipients, crmCampaigns } =
      await import("../../packages/db/src/schema/crmCampaigns.ts");
    const { crmWebhookEffectOutbox, providerEvents } =
      await import("../../packages/db/src/schema/providerEvents.ts");
    const finalForeignKeys = [
      ...foreignKeyNames(crmTags),
      ...foreignKeyNames(crmOutboundIntents),
      ...foreignKeyNames(crmScheduledMessages),
      ...foreignKeyNames(crmCampaigns),
      ...foreignKeyNames(crmCampaignRecipients),
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

function tableName(table) {
  return getTableConfig(table).name;
}

function foreignKeyNames(table) {
  return getTableConfig(table).foreignKeys.map((foreignKey) =>
    foreignKey.getName(),
  );
}
