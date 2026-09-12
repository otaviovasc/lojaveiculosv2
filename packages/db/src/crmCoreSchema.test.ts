import { readFileSync } from "node:fs";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  crmExternalBotActionCommandState,
  crmExternalBotActionCommands,
  crmMessages,
  consentReceipts,
  contactIdentities,
  contactIdentityCandidates,
  credentialBroker,
  messagingChannel,
  opportunities,
  conversationAttendances,
  conversationThreads,
  crmExternalBotEventOutbox,
  crmExternalBotPolicies,
  crmExternalBotProposals,
  integrationEvents,
  crmChannelConnections,
  crmExternalBotProviderEffectState,
  transportProvider,
} from "./index.js";

const migrationSql = readFileSync(
  new URL("../migrations/0031_crm_core_canonical.sql", import.meta.url),
  "utf8",
);
const integrityMigrationSql = readFileSync(
  new URL(
    "../migrations/0035_crm_core_semantic_integrity.sql",
    import.meta.url,
  ),
  "utf8",
);
const providerConsentMigrationSql = readFileSync(
  new URL(
    "../migrations/0037_crm_core_provider_consent_integrity.sql",
    import.meta.url,
  ),
  "utf8",
);
const identityCandidatesMigrationSql = readFileSync(
  new URL(
    "../migrations/0039_crm_contact_identity_candidates.sql",
    import.meta.url,
  ),
  "utf8",
);
const canonicalCutoverMigrationSql = readFileSync(
  new URL(
    "../migrations/0055_canonical_crm_routing_cutover.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("canonical CRM core schema", () => {
  it("separates channel, transport, broker, and command state", () => {
    expect(messagingChannel.enumValues).toEqual([
      "whatsapp",
      "instagram",
      "olx_chat",
    ]);
    expect(transportProvider.enumValues).toEqual([
      "meta_cloud",
      "zapi",
      "olx",
      "uazapi",
    ]);
    expect(credentialBroker.enumValues).toEqual(["composio", "direct"]);
    expect(crmExternalBotActionCommandState.enumValues).toEqual([
      "accepted",
      "pending_approval",
      ...crmExternalBotProviderEffectState.enumValues.slice(1),
    ]);
  });

  it("supports unlinked observed identities and CAS revisions", () => {
    expect(contactIdentities.contactId.notNull).toBe(false);
    for (const table of [
      contactIdentities,
      opportunities,
      crmChannelConnections,
      crmMessages,
      crmExternalBotActionCommands,
    ]) {
      const revision = getTableConfig(table).columns.find(
        ({ name }) => name === "revision",
      );
      expect(revision).toMatchObject({ hasDefault: true, notNull: true });
    }
  });

  it("persists identity suggestions without linking and enforces their scope", () => {
    expect(contactIdentities.contactId.notNull).toBe(false);
    expect(
      getTableConfig(contactIdentityCandidates).foreignKeys.map((key) =>
        key.getName(),
      ),
    ).toEqual(
      expect.arrayContaining([
        "contact_identity_candidates_scoped_identity_fk",
        "contact_identity_candidates_scoped_contact_fk",
      ]),
    );
    expect(identityCandidatesMigrationSql).toContain(
      'CREATE TABLE "contact_identity_candidates"',
    );
    expect(identityCandidatesMigrationSql).not.toMatch(/INSERT INTO/);
  });

  it("backfills safely and persists reconciliation findings", () => {
    expect(migrationSql).toContain('FROM "integration_accounts" account');
    expect(migrationSql).toContain("{connection,scope}");
    expect(migrationSql).toContain("{connection,providerAccountId}");
    expect(migrationSql).not.toContain("{credentials");
    expect(migrationSql).not.toContain("accessToken");
    expect(migrationSql).not.toContain("refreshToken");
    expect(migrationSql).toContain("session.\"channel\" = 'WEB_CHAT'");
    expect(migrationSql).toContain(
      "session.\"channel\" IN ('WHATSAPP', 'INSTAGRAM', 'OLX_CHAT')",
    );
    expect(migrationSql).toContain("migration-summary:0031");
    expect(migrationSql).toContain('ON CONFLICT ("id") DO NOTHING');
    expect(migrationSql).toContain('first_value(session."id") OVER');
    expect(migrationSql).toContain("AS canonical_thread_id");
    expect(migrationSql).toContain(
      'JOIN "conversation_threads" thread ON thread."id" = session.canonical_thread_id',
    );
    expect(migrationSql).not.toMatch(/https?:\/\//);
  });

  it("rejects cross-linked provider, thread, cycle, grant, and effect graphs", () => {
    const foreignKeyNames = [
      crmChannelConnections,
      conversationThreads,
      crmMessages,
      conversationAttendances,
      crmExternalBotActionCommands,
    ].flatMap((table) =>
      getTableConfig(table).foreignKeys.map((foreignKey) =>
        foreignKey.getName(),
      ),
    );

    expect(foreignKeyNames).toEqual(
      expect.arrayContaining([
        "crm_channel_connections_semantic_authorization_fk",
        "conversation_threads_semantic_connection_fk",
        "crm_messages_semantic_connection_fk",
        "crm_messages_semantic_thread_fk",
        "crm_messages_semantic_cycle_fk",
        "conversation_attendances_semantic_cycle_fk",
        "crm_external_bot_action_commands_semantic_grant_fk",
      ]),
    );
    expect(integrityMigrationSql).toContain(
      '"provider_effects_semantic_command_fk"',
    );
  });

  it("reflects the external bot runtime and enforces scoped actors and vehicles", () => {
    expect(getTableConfig(crmExternalBotEventOutbox).name).toBe(
      "crm_external_bot_event_outbox",
    );
    expect(
      getTableConfig(crmExternalBotProposals).foreignKeys.map((key) =>
        key.getName(),
      ),
    ).toContain("crm_external_bot_proposals_semantic_command_fk");
    expect(integrityMigrationSql).toContain(
      'CREATE FUNCTION "crm_core_require_active_assignee"',
    );
    expect(integrityMigrationSql).toContain(
      'CREATE FUNCTION "crm_core_require_scoped_vehicle_interest"',
    );
    expect(integrityMigrationSql).toContain(
      'unit."listing_id" = NEW."listing_id"',
    );
  });

  it("defines typed per-channel bot policies and a fail-closed cutover", () => {
    expect(getTableConfig(crmExternalBotPolicies).name).toBe(
      "crm_external_bot_policies",
    );
    expect(canonicalCutoverMigrationSql).toContain(
      "CRM canonical cutover requires an empty crm_connections table",
    );
    expect(canonicalCutoverMigrationSql).toContain(
      'RENAME TO "crm_channel_connections"',
    );
    expect(canonicalCutoverMigrationSql).toContain(
      "'auto','proposal','disabled'",
    );
  });

  it("binds provider events and outbox rows to the exact connection provider", () => {
    expect(
      getTableConfig(integrationEvents).foreignKeys.map((key) => key.getName()),
    ).toContain("integration_events_semantic_connection_fk");
    expect(
      getTableConfig(crmExternalBotEventOutbox).foreignKeys.map((key) =>
        key.getName(),
      ),
    ).toContain("crm_external_bot_event_outbox_semantic_connection_fk");
    expect(
      getTableConfig(crmChannelConnections).checks.map((check) => check.name),
    ).toContain("crm_channel_connections_supported_triple_check");
  });

  it("requires explicit consent provenance and scopes identity to its contact", () => {
    expect(consentReceipts.source.notNull).toBe(true);
    expect(consentReceipts.policyVersion.notNull).toBe(true);
    expect(consentReceipts.identityId.notNull).toBe(false);
    expect(
      getTableConfig(consentReceipts).foreignKeys.map((key) => key.getName()),
    ).toContain("consent_receipts_semantic_identity_fk");
    expect(providerConsentMigrationSql).not.toMatch(
      /ADD COLUMN "(?:policy_version|source)"[^;]*DEFAULT/,
    );
    expect(providerConsentMigrationSql).toContain(
      "requires explicit policy_version and source",
    );
  });
});
