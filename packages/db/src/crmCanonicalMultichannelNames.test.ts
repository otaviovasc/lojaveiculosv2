import { readFileSync } from "node:fs";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import * as databaseSchema from "./index.js";
import {
  crmCampaignRecipients,
  crmCampaignRecipientStatus,
  crmCampaigns,
  crmCampaignStatus,
  crmChannelConnections,
  crmChannelConnectionState,
  crmChannelRoutingPolicies,
  crmExternalBotActionCommands,
  crmExternalBotActionCommandState,
  crmExternalBotAuthorizationClass,
  crmExternalBotGrants,
  crmExternalBotGrantState,
  crmExternalBotProviderEffects,
  crmExternalBotProviderEffectState,
  crmExternalBotRouteMode,
  crmMessages,
  crmMessageDirection,
  crmMessageOrigin,
  crmMessageSender,
  crmMessageStatus,
  crmOutboundIntents,
  crmOutboundIntentStatus,
  crmQuickMessageKind,
  crmQuickMessages,
  crmScheduledMessageStatus,
  crmScheduledMessages,
  messagingChannel,
} from "./index.js";

const migration = readFileSync(
  new URL(
    "../migrations/0059_canonical_crm_multichannel_names.sql",
    import.meta.url,
  ),
  "utf8",
);
const journal = JSON.parse(
  readFileSync(
    new URL("../migrations/meta/_journal.json", import.meta.url),
    "utf8",
  ),
) as { entries: { idx: number; tag: string }[] };
const runtimeSchemaSource = [
  "schema/crmCampaigns.ts",
  "schema/crmCore/authorization.ts",
  "schema/crmCore/effects.ts",
  "schema/crmCore/enums.ts",
  "schema/crmCore/execution.ts",
  "schema/crmCore/messages.ts",
  "schema/crmOutbound.ts",
  "schema/crmQuickMessages.ts",
  "schema/crmRouting.ts",
  "schema/crmScheduled.ts",
].map((path) => readFileSync(new URL(path, import.meta.url), "utf8"));

const tableName = (table: Parameters<typeof getTableConfig>[0]) =>
  getTableConfig(table).name;
const columnNames = (table: Parameters<typeof getTableConfig>[0]) =>
  getTableConfig(table).columns.map(({ name }) => name);
const catalogNames = (table: Parameters<typeof getTableConfig>[0]) => {
  const config = getTableConfig(table);
  return [
    ...config.checks.map(({ name }) => name),
    ...config.foreignKeys.map((foreignKey) => foreignKey.getName()),
    ...config.indexes.map(({ config: index }) => index.name),
  ];
};

describe("canonical multichannel CRM names", () => {
  it("exports only canonical table symbols and physical names", () => {
    expect([
      tableName(crmChannelConnections),
      tableName(crmMessages),
      tableName(crmQuickMessages),
      tableName(crmOutboundIntents),
      tableName(crmScheduledMessages),
      tableName(crmCampaigns),
      tableName(crmCampaignRecipients),
      tableName(crmExternalBotGrants),
      tableName(crmExternalBotActionCommands),
      tableName(crmExternalBotProviderEffects),
    ]).toEqual([
      "crm_channel_connections",
      "crm_messages",
      "crm_quick_messages",
      "crm_outbound_intents",
      "crm_scheduled_messages",
      "crm_campaigns",
      "crm_campaign_recipients",
      "crm_external_bot_grants",
      "crm_external_bot_action_commands",
      "crm_external_bot_provider_effects",
    ]);

    for (const staleExport of [
      "providerConnections",
      "canonicalMessages",
      "crmWhatsappQuickMessages",
      "crmWhatsappQuickMessageKind",
      "crmWhatsappOutboundIntents",
      "crmWhatsappOutboundIntentStatus",
      "crmWhatsappScheduledMessages",
      "crmWhatsappScheduledMessageStatus",
      "crmWhatsappCampaigns",
      "crmWhatsappCampaignStatus",
      "crmWhatsappCampaignRecipients",
      "crmWhatsappCampaignRecipientStatus",
      "botIntegrationGrants",
      "botActionCommands",
      "providerEffects",
      "crmRoutingChannel",
      "crmBotRoutingMode",
    ]) {
      expect(databaseSchema).not.toHaveProperty(staleExport);
    }
  });

  it("uses canonical columns, enums, constraints, and indexes", () => {
    expect(columnNames(crmScheduledMessages)).toEqual(
      expect.arrayContaining(["recipient_address", "content"]),
    );
    expect(columnNames(crmScheduledMessages)).not.toEqual(
      expect.arrayContaining(["phone", "text"]),
    );
    expect(columnNames(crmCampaignRecipients)).toContain("recipient_address");
    expect(columnNames(crmCampaignRecipients)).not.toContain("phone");
    expect(columnNames(crmChannelRoutingPolicies)).toEqual(
      expect.arrayContaining([
        "channel",
        "external_bot_connection_id",
        "external_bot_mode",
      ]),
    );
    expect(columnNames(crmChannelRoutingPolicies)).not.toEqual(
      expect.arrayContaining(["bot_connection_id", "bot_mode"]),
    );

    expect([
      crmChannelConnectionState.enumName,
      crmMessageDirection.enumName,
      crmMessageStatus.enumName,
      crmMessageSender.enumName,
      crmMessageOrigin.enumName,
      crmQuickMessageKind.enumName,
      crmOutboundIntentStatus.enumName,
      crmScheduledMessageStatus.enumName,
      crmCampaignStatus.enumName,
      crmCampaignRecipientStatus.enumName,
      crmExternalBotGrantState.enumName,
      crmExternalBotActionCommandState.enumName,
      crmExternalBotAuthorizationClass.enumName,
      crmExternalBotProviderEffectState.enumName,
      crmExternalBotRouteMode.enumName,
      messagingChannel.enumName,
    ]).toEqual([
      "crm_channel_connection_state",
      "crm_message_direction",
      "crm_message_status",
      "crm_message_sender",
      "crm_message_origin",
      "crm_quick_message_kind",
      "crm_outbound_intent_status",
      "crm_scheduled_message_status",
      "crm_campaign_status",
      "crm_campaign_recipient_status",
      "crm_external_bot_grant_state",
      "crm_external_bot_action_command_state",
      "crm_external_bot_authorization_class",
      "crm_external_bot_provider_effect_state",
      "crm_external_bot_route_mode",
      "messaging_channel",
    ]);

    const allCatalogNames = [
      crmChannelConnections,
      crmMessages,
      crmQuickMessages,
      crmOutboundIntents,
      crmScheduledMessages,
      crmCampaigns,
      crmCampaignRecipients,
      crmExternalBotGrants,
      crmExternalBotActionCommands,
      crmExternalBotProviderEffects,
      crmChannelRoutingPolicies,
    ].flatMap(catalogNames);
    expect(allCatalogNames.join("\n")).not.toMatch(
      /crm_whatsapp_(?:quick|outbound|scheduled|campaign)|(?:^|\n)(?:bot_integration|bot_action|provider_effects|provider_connections|canonical_messages)|crm_channel_routing_policies_bot_/u,
    );
  });

  it("keeps old current-runtime names out of the Drizzle source", () => {
    expect(runtimeSchemaSource.join("\n")).not.toMatch(
      /crmWhatsapp|providerConnections|canonicalMessages|botIntegrationGrants|botActionCommands|providerEffects|crmRoutingChannel|crmBotRoutingMode/u,
    );
    expect(runtimeSchemaSource.join("\n")).not.toMatch(
      /"(?:crm_whatsapp_(?:quick_messages|outbound_intents|scheduled_messages|campaigns|campaign_recipients)|bot_integration_grants|bot_action_commands|provider_effects|provider_connections|canonical_messages|crm_routing_channel|crm_bot_routing_mode|bot_connection_id|bot_mode)"/u,
    );
  });

  it("fails fast on legacy rows before the 0059 rename and routing-enum cutover", () => {
    expect(migration).toContain(
      "CRM canonical multichannel cutover requires an empty % table",
    );
    for (const legacyTable of [
      "crm_whatsapp_quick_messages",
      "crm_whatsapp_outbound_intents",
      "crm_whatsapp_scheduled_messages",
      "crm_whatsapp_campaigns",
      "crm_whatsapp_campaign_recipients",
      "bot_integration_grants",
      "bot_action_commands",
      "provider_effects",
    ]) {
      expect(migration).toContain(`'${legacyTable}'`);
    }

    for (const [oldName, newName] of [
      ["crm_whatsapp_quick_messages", "crm_quick_messages"],
      ["crm_whatsapp_outbound_intents", "crm_outbound_intents"],
      ["crm_whatsapp_scheduled_messages", "crm_scheduled_messages"],
      ["crm_whatsapp_campaigns", "crm_campaigns"],
      ["crm_whatsapp_campaign_recipients", "crm_campaign_recipients"],
      ["bot_integration_grants", "crm_external_bot_grants"],
      ["bot_action_commands", "crm_external_bot_action_commands"],
      ["provider_effects", "crm_external_bot_provider_effects"],
    ]) {
      expect(migration).toContain(
        `ALTER TABLE "${oldName}" RENAME TO "${newName}"`,
      );
    }
    for (const [oldName, newName] of [
      ["provider_connection_state", "crm_channel_connection_state"],
      ["canonical_message_direction", "crm_message_direction"],
      ["canonical_message_status", "crm_message_status"],
      ["canonical_message_sender", "crm_message_sender"],
      ["canonical_message_origin", "crm_message_origin"],
      ["crm_whatsapp_quick_message_kind", "crm_quick_message_kind"],
      ["crm_whatsapp_outbound_intent_status", "crm_outbound_intent_status"],
      ["crm_whatsapp_scheduled_message_status", "crm_scheduled_message_status"],
      ["crm_whatsapp_campaign_status", "crm_campaign_status"],
      [
        "crm_whatsapp_campaign_recipient_status",
        "crm_campaign_recipient_status",
      ],
      ["bot_integration_grant_state", "crm_external_bot_grant_state"],
      ["bot_action_command_state", "crm_external_bot_action_command_state"],
      ["bot_authorization_class", "crm_external_bot_authorization_class"],
      ["provider_effect_state", "crm_external_bot_provider_effect_state"],
      ["crm_bot_routing_mode", "crm_external_bot_route_mode"],
    ]) {
      expect(migration).toContain(
        `ALTER TYPE "${oldName}" RENAME TO "${newName}"`,
      );
    }
    expect(migration).not.toMatch(/DROP TABLE/u);
    expect(migration.match(/TYPE "messaging_channel"/gu)).toHaveLength(2);
    expect(migration).toContain('DROP TYPE "crm_routing_channel"');
    expect(migration).toContain(
      "'_provider_connection_id_provider_connect.*$'",
    );
    expect(migration).toContain("'_message_id_canonical_messages.*$'");
    expect(migration).toContain("'_campaign_id_crm_whatsapp_campa.*$'");
    expect(journal.entries.find((entry) => entry.idx === 59)).toMatchObject({
      idx: 59,
      tag: "0059_canonical_crm_multichannel_names",
    });
  });

  it("replaces stored function bodies that PostgreSQL table renames cannot rewrite", () => {
    const functionReplacement = migration.match(
      /CREATE OR REPLACE FUNCTION "crm_core_reject_human_bot_effect"\(\)[\s\S]*?\$\$;/u,
    )?.[0];

    expect(functionReplacement).toBeDefined();
    expect(functionReplacement).toContain(
      'FROM "public"."crm_external_bot_action_commands" command',
    );
    expect(functionReplacement).not.toContain('FROM "bot_action_commands"');
  });

  it("projects and deletes every stale permission key safely", () => {
    expect(migration).toContain('bool_and(existing."allowed")');
    expect(migration).toContain(
      'ON CONFLICT ("membership_id", "permission_key") DO UPDATE SET',
    );
    expect(migration).toContain(
      '"allowed" = "membership_permission_overrides"."allowed" AND EXCLUDED."allowed"',
    );
    expect(migration).toContain(
      "('crm.whatsapp.list', 'crm.conversations.read')",
    );
    expect(migration).toContain(
      "('crm.whatsapp.read', 'crm.conversations.read')",
    );
    for (const permission of [
      "crm.messaging.connection.setup",
      "crm.bot.manage",
      "crm.bot.read",
      "crm.bot.proposals.decide",
    ]) {
      expect(migration).toContain(
        `('crm.whatsapp.integrations.manage', '${permission}')`,
      );
    }
    expect(
      migration.match(
        /\('crm\.whatsapp\.integrations\.manage', 'crm\.bot\.proposals\.decide'\)/gu,
      ),
    ).toHaveLength(2);
    expect(migration.match(/DELETE FROM/gu)).toHaveLength(2);
    expect(
      migration.match(/'crm\.whatsapp\.integrations\.manage'/gu),
    ).toHaveLength(10);
  });
});
