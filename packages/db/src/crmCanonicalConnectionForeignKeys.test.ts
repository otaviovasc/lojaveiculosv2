import { readFileSync } from "node:fs";
import { getTableName } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  crmWebhookEffectOutbox,
  crmTags,
  crmWhatsappCampaignRecipients,
  crmWhatsappCampaigns,
  crmWhatsappInterventionLedger,
  crmWhatsappMessages,
  crmWhatsappOutboundIntents,
  crmWhatsappScheduledMessages,
  crmWhatsappSessions,
  providerEvents,
} from "./index.js";

const migration = readFileSync(
  new URL(
    "../migrations/0057_canonical_crm_connection_foreign_keys.sql",
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

const connectionReferences = [
  { column: "connection_id", direct: true, table: crmWhatsappSessions },
  { column: "connection_id", direct: true, table: crmWhatsappMessages },
  { column: "connection_id", direct: false, table: providerEvents },
  { column: "connection_id", direct: true, table: crmWebhookEffectOutbox },
  {
    column: "connection_id",
    direct: true,
    table: crmWhatsappScheduledMessages,
  },
  { column: "connection_id", direct: true, table: crmWhatsappOutboundIntents },
  {
    column: "selected_connection_id",
    direct: true,
    table: crmWhatsappCampaigns,
  },
  {
    column: "connection_id",
    direct: true,
    table: crmWhatsappCampaignRecipients,
  },
  { column: "connection_id", direct: true, table: crmTags },
  {
    column: "connection_id",
    direct: false,
    table: crmWhatsappInterventionLedger,
  },
] as const;

const legacyConstraintNames = [
  "crm_tags_connection_id_crm_connections_id_fk",
  "crm_webhook_effect_outbox_connection_id_crm_connections_id_fk",
  "crm_webhook_effect_outbox_scoped_connection_fk",
  "crm_whatsapp_campaign_recipients_connection_id_crm_connections_",
  "crm_whatsapp_campaigns_selected_connection_id_crm_connections_i",
  "crm_whatsapp_intervention_ledger_scoped_connection_fk",
  "crm_whatsapp_messages_connection_id_crm_connections_id_fk",
  "crm_whatsapp_outbound_intents_connection_id_crm_connections_id_",
  "crm_whatsapp_outbound_intents_scoped_connection_fk",
  "crm_whatsapp_scheduled_messages_connection_id_crm_connections_i",
  "crm_whatsapp_sessions_connection_id_crm_connections_id_fk",
  "crm_whatsapp_sessions_scoped_connection_fk",
  "provider_events_scoped_connection_fk",
].sort();

const canonicalConstraintNames = [
  "crm_tags_connection_fk",
  "crm_tags_scoped_connection_fk",
  "crm_webhook_effect_outbox_connection_fk",
  "crm_webhook_effect_outbox_scoped_connection_fk",
  "crm_whatsapp_campaign_recipients_connection_fk",
  "crm_whatsapp_campaign_recipients_scoped_connection_fk",
  "crm_whatsapp_campaigns_scoped_connection_fk",
  "crm_whatsapp_campaigns_selected_connection_fk",
  "crm_whatsapp_intervention_ledger_scoped_connection_fk",
  "crm_whatsapp_messages_connection_fk",
  "crm_whatsapp_messages_scoped_connection_fk",
  "crm_whatsapp_outbound_intents_connection_fk",
  "crm_whatsapp_outbound_intents_scoped_connection_fk",
  "crm_whatsapp_scheduled_messages_connection_fk",
  "crm_whatsapp_scheduled_messages_scoped_connection_fk",
  "crm_whatsapp_sessions_connection_fk",
  "crm_whatsapp_sessions_scoped_connection_fk",
  "provider_events_scoped_connection_fk",
].sort();

describe("canonical CRM connection foreign keys", () => {
  it("binds every scoped connection reference to crm_channel_connections", () => {
    for (const { column, table } of connectionReferences) {
      const config = getTableConfig(table);
      const scopedConnection = config.foreignKeys.find((foreignKey) =>
        foreignKey.getName().endsWith("scoped_connection_fk"),
      );
      const reference = scopedConnection?.reference();

      expect(
        scopedConnection,
        `${config.name} scoped connection FK`,
      ).toBeDefined();
      expect(reference && getTableName(reference.foreignTable)).toBe(
        "crm_channel_connections",
      );
      expect(reference?.columns.map(({ name }) => name)).toEqual([
        "tenant_id",
        "store_id",
        column,
      ]);
      expect(reference?.foreignColumns.map(({ name }) => name)).toEqual([
        "tenant_id",
        "store_id",
        "id",
      ]);
    }
  });

  it("points single-column connection references at the canonical table", () => {
    for (const { column, table } of connectionReferences.filter(
      ({ direct }) => direct,
    )) {
      const config = getTableConfig(table);
      const directConnection = config.foreignKeys.find((foreignKey) => {
        const reference = foreignKey.reference();
        return (
          reference.columns.length === 1 &&
          reference.columns[0]?.name === column
        );
      });

      expect(
        directConnection,
        `${config.name} direct connection FK`,
      ).toBeDefined();
      expect(
        directConnection &&
          getTableName(directConnection.reference().foreignTable),
      ).toBe("crm_channel_connections");
    }
  });

  it("fails closed before replacing legacy constraints without data rewriting", () => {
    const addedConstraints = [
      ...migration.matchAll(/ADD CONSTRAINT "([^"]+)"/g),
    ]
      .map(([, name]) => name)
      .sort();
    const droppedConstraints = [
      ...migration.matchAll(/DROP CONSTRAINT "([^"]+)"/g),
    ]
      .map(([, name]) => name)
      .sort();
    const validatedConstraints = [
      ...migration.matchAll(/VALIDATE CONSTRAINT "([^"]+)"/g),
    ]
      .map(([, name]) => name)
      .sort();

    expect(migration).toContain(
      "CRM connection FK canonicalization requires canonical table crm_channel_connections",
    );
    expect(migration).toContain("orphaned or cross-scope rows");
    expect(migration).toContain("Expected legacy constraint");
    expect(migration.indexOf("orphaned or cross-scope rows")).toBeLessThan(
      migration.indexOf('ALTER TABLE "crm_whatsapp_sessions" DROP CONSTRAINT'),
    );
    expect(droppedConstraints).toEqual(legacyConstraintNames);
    expect(addedConstraints).toEqual(canonicalConstraintNames);
    expect(validatedConstraints).toEqual(canonicalConstraintNames);
    for (const { column, table } of connectionReferences) {
      expect(migration).toContain(`('${getTableName(table)}', '${column}')`);
    }
    expect(migration).not.toMatch(
      /ADD CONSTRAINT[^;]+REFERENCES "public"\."crm_connections"/u,
    );
    expect(migration).not.toMatch(/(?:^|\n)\s*(?:INSERT|UPDATE|DELETE)\s/u);
  });

  it("registers the forward migration after the routing cutover", () => {
    expect(journal.entries.at(-1)).toEqual({
      breakpoints: true,
      idx: 57,
      tag: "0057_canonical_crm_connection_foreign_keys",
      version: "7",
      when: 1787083200000,
    });
    expect(journal.entries.findIndex(({ idx }) => idx === 57)).toBeGreaterThan(
      journal.entries.findIndex(({ idx }) => idx === 55),
    );
  });
});
