import { readFileSync } from "node:fs";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import * as databaseSchema from "./index.js";
import {
  canonicalMessageOrigin,
  canonicalMessages,
  conversationAttendanceActorKind,
  conversationAttendanceEvents,
  conversationAttendances,
  conversationCommandReceipts,
  conversationCommandResult,
  conversationCycles,
  conversationThreads,
  conversationThreadTags,
  crmLeadOutcomes,
  crmWebhookEffectOutbox,
  crmWhatsappCampaignRecipients,
  crmWhatsappOutboundIntents,
  crmWhatsappScheduledMessages,
} from "./index.js";

const migration = readFileSync(
  new URL(
    "../migrations/0058_canonical_crm_operational_cutover.sql",
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
const crmSeed = readFileSync(
  new URL(
    "../../../docker/postgres/seed/product/55-crm-scenarios.sql",
    import.meta.url,
  ),
  "utf8",
);

const columnNames = (table: Parameters<typeof getTableConfig>[0]) =>
  getTableConfig(table).columns.map(({ name }) => name);

describe("canonical CRM operational schema", () => {
  it("exports the Inbox thread, cycle, attendance, and message state", () => {
    expect(columnNames(conversationThreads)).toEqual(
      expect.arrayContaining([
        "id",
        "provider_connection_id",
        "customer_display_name",
        "customer_phone",
        "customer_chat_id",
        "profile_photo_url",
        "channel_metadata",
      ]),
    );
    expect(columnNames(conversationCycles)).toEqual(
      expect.arrayContaining([
        "id",
        "thread_id",
        "assigned_user_id",
        "fresh_lead_at",
        "first_handled_at",
        "last_read_at",
        "last_customer_read_at",
        "last_message_at",
        "last_message_content",
        "message_count",
      ]),
    );
    expect(columnNames(conversationAttendances)).toEqual(
      expect.arrayContaining([
        "id",
        "thread_id",
        "cycle_id",
        "assigned_user_id",
        "assigned_at",
        "state_version",
        "intervention_id",
        "handoff_requested_at",
        "handling_started_at",
        "handback_requested_at",
      ]),
    );
    expect(columnNames(canonicalMessages)).toEqual(
      expect.arrayContaining([
        "id",
        "thread_id",
        "cycle_id",
        "provider_connection_id",
        "provider_message_id",
        "sender_origin",
        "deleted_at",
      ]),
    );
    expect(canonicalMessageOrigin.enumValues).toContain("human_channel");
  });

  it("provides scoped thread tags and idempotent cycle command receipts", () => {
    expect(getTableConfig(conversationThreadTags).name).toBe(
      "crm_conversation_thread_tags",
    );
    expect(columnNames(conversationThreadTags)).toEqual(
      expect.arrayContaining([
        "id",
        "tenant_id",
        "store_id",
        "thread_id",
        "tag_id",
      ]),
    );
    expect(getTableConfig(conversationCommandReceipts).name).toBe(
      "crm_conversation_command_receipts",
    );
    expect(columnNames(conversationCommandReceipts)).toEqual(
      expect.arrayContaining([
        "id",
        "command_id",
        "thread_id",
        "cycle_id",
        "cycle_revision",
        "command_type",
        "request_fingerprint",
        "result",
      ]),
    );
    expect(conversationCommandResult.enumValues).toEqual([
      "applied",
      "already_applied",
      "superseded",
    ]);
  });

  it("keeps handoff history append-only and cycle-scoped", () => {
    expect(getTableConfig(conversationAttendanceEvents).name).toBe(
      "crm_conversation_attendance_events",
    );
    expect(conversationAttendanceActorKind.enumValues).toEqual([
      "user",
      "support",
      "provider",
      "bot",
      "system",
    ]);
    expect(migration).toContain(
      'CREATE CONSTRAINT TRIGGER "crm_conversation_attendance_transition_has_event_trigger"',
    );
    expect(migration).toContain(
      'CREATE CONSTRAINT TRIGGER "crm_conversation_attendance_event_matches_state_trigger"',
    );
    expect(migration).toContain(
      'NEW."state_version" <> OLD."state_version" + 1',
    );
    expect(migration).toContain(
      'CREATE TRIGGER "crm_conversation_attendance_events_append_only_trigger"',
    );
  });

  it("matches every post-cutover dependent column and foreign key", () => {
    const expected = [
      {
        absent: ["session_id"],
        columns: ["thread_id", "cycle_id", "message_id"],
        foreignKeys: [
          "crm_webhook_effect_outbox_message_fk",
          "crm_webhook_effect_outbox_scoped_thread_fk",
          "crm_webhook_effect_outbox_semantic_cycle_fk",
          "crm_webhook_effect_outbox_semantic_message_fk",
        ],
        table: crmWebhookEffectOutbox,
      },
      {
        absent: ["session_id"],
        columns: ["thread_id", "cycle_id", "message_id"],
        foreignKeys: [
          "crm_whatsapp_outbound_intents_message_fk",
          "crm_whatsapp_outbound_intents_scoped_thread_fk",
          "crm_whatsapp_outbound_intents_semantic_cycle_fk",
          "crm_whatsapp_outbound_intents_semantic_message_fk",
        ],
        table: crmWhatsappOutboundIntents,
      },
      {
        absent: ["session_id"],
        columns: ["thread_id", "cycle_id", "sent_message_id"],
        foreignKeys: [
          "crm_whatsapp_scheduled_messages_sent_message_fk",
          "crm_whatsapp_scheduled_messages_scoped_campaign_fk",
          "crm_whatsapp_scheduled_messages_scoped_creator_membership_fk",
          "crm_whatsapp_scheduled_messages_scoped_sent_message_fk",
          "crm_whatsapp_scheduled_messages_scoped_thread_fk",
          "crm_whatsapp_scheduled_messages_semantic_cycle_fk",
        ],
        table: crmWhatsappScheduledMessages,
      },
      {
        absent: ["session_id"],
        columns: ["thread_id"],
        foreignKeys: [
          "crm_whatsapp_campaign_recipients_scoped_campaign_fk",
          "crm_whatsapp_campaign_recipients_scoped_lead_fk",
          "crm_whatsapp_campaign_recipients_scoped_reply_message_fk",
          "crm_whatsapp_campaign_recipients_scoped_sent_message_fk",
          "crm_whatsapp_campaign_recipients_scoped_thread_fk",
        ],
        table: crmWhatsappCampaignRecipients,
      },
      {
        absent: ["origin_session_id"],
        columns: ["origin_cycle_id"],
        foreignKeys: [
          "crm_lead_outcomes_origin_cycle_fk",
          "crm_lead_outcomes_scoped_lead_fk",
          "crm_lead_outcomes_scoped_next_pipeline_stage_fk",
          "crm_lead_outcomes_scoped_origin_cycle_fk",
          "crm_lead_outcomes_scoped_previous_pipeline_stage_fk",
          "crm_lead_outcomes_scoped_sale_fk",
        ],
        table: crmLeadOutcomes,
      },
    ] as const;

    for (const item of expected) {
      const config = getTableConfig(item.table);
      const columns = config.columns.map(({ name }) => name);
      const foreignKeys = config.foreignKeys.map((key) => key.getName());

      expect(columns).toEqual(expect.arrayContaining([...item.columns]));
      expect(columns).not.toEqual(expect.arrayContaining([...item.absent]));
      expect(foreignKeys).toEqual(
        expect.arrayContaining([...item.foreignKeys]),
      );
    }
  });

  it("does not export legacy connection, session, message, tag, command, or intervention schemas", () => {
    for (const exportName of [
      "crmConnections",
      "crmWhatsappChannel",
      "crmWhatsappHumanAttendanceState",
      "crmWhatsappMessageDirection",
      "crmWhatsappMessageSenderOrigin",
      "crmWhatsappMessageSenderType",
      "crmWhatsappMessageStatus",
      "crmWhatsappMessageType",
      "crmWhatsappMessages",
      "crmWhatsappSessions",
      "crmWhatsappSessionTags",
      "crmWhatsappSessionCommandReceipts",
      "crmWhatsappSessionCommandResult",
      "crmWhatsappInterventionLedger",
    ]) {
      expect(databaseSchema).not.toHaveProperty(exportName);
    }
  });

  it("fails before DDL when any reset-only legacy or dependent table has rows", () => {
    const guard = migration.indexOf(
      "CRM canonical operational cutover requires an empty",
    );
    const firstDdl = migration.indexOf(
      'CREATE TYPE "public"."canonical_message_origin"',
    );

    expect(guard).toBeGreaterThanOrEqual(0);
    expect(guard).toBeLessThan(firstDdl);
    for (const table of [
      "crm_connections",
      "crm_whatsapp_sessions",
      "crm_whatsapp_messages",
      "crm_whatsapp_session_tags",
      "crm_whatsapp_session_command_receipts",
      "crm_whatsapp_intervention_ledger",
      "crm_webhook_effect_outbox",
      "crm_whatsapp_outbound_intents",
      "crm_whatsapp_scheduled_messages",
      "crm_whatsapp_campaign_recipients",
      "crm_lead_outcomes",
    ]) {
      expect(migration).toContain(`'${table}'`);
    }
    expect(migration).not.toMatch(/\bINSERT\s+INTO\b/iu);
    expect(migration).not.toMatch(/CREATE(?:\s+OR\s+REPLACE)?\s+VIEW/iu);
  });

  it("rewires dependent operations and removes the compatibility persistence path", () => {
    expect(migration).toContain('RENAME COLUMN "session_id" TO "cycle_id"');
    expect(migration).toContain('RENAME COLUMN "session_id" TO "thread_id"');
    expect(migration).toContain(
      'RENAME COLUMN "origin_session_id" TO "origin_cycle_id"',
    );
    expect(migration).toContain(
      'ALTER COLUMN "channel" TYPE "messaging_channel"',
    );
    expect(migration).toContain(
      'DROP VIEW IF EXISTS "crm_retention_legacy_coverage"',
    );
    for (const table of [
      "crm_whatsapp_session_command_receipts",
      "crm_whatsapp_session_tags",
      "crm_whatsapp_messages",
      "crm_whatsapp_sessions",
      "crm_connections",
    ]) {
      expect(migration).toContain(`DROP TABLE "${table}"`);
    }
    expect(migration).toContain(
      'DROP FUNCTION IF EXISTS "guard_crm_connection_provider_identity"()',
    );
  });

  it("seeds only canonical Inbox persistence after the reset", () => {
    expect(crmSeed).toContain("INSERT INTO crm_conversation_threads");
    expect(crmSeed).toContain("INSERT INTO crm_conversation_cycles");
    expect(crmSeed).toContain("INSERT INTO crm_conversation_attendances");
    expect(crmSeed).toContain("INSERT INTO crm_messages");
    expect(crmSeed).toContain("INSERT INTO crm_conversation_thread_tags");
    expect(crmSeed).not.toMatch(
      /crm_whatsapp_(?:sessions|messages|session_tags)/u,
    );
  });

  it("registers migration 0058 after canonical connection foreign keys", () => {
    expect(journal.entries.at(-1)).toMatchObject({
      idx: 58,
      tag: "0058_canonical_crm_operational_cutover",
    });
  });
});
