import { readFileSync } from "node:fs";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  crmWhatsappInterventionActorKind,
  crmWhatsappInterventionLedger,
  crmWhatsappMessages,
  crmWhatsappMessageSenderOrigin,
  crmWhatsappSessions,
} from "./index.js";

const migrationSql = readFileSync(
  new URL(
    "../migrations/0022_crm_whatsapp_consistency_contract.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("CRM WhatsApp consistency schema", () => {
  it("publishes the canonical sender origin and safe message default", () => {
    const messages = getTableConfig(crmWhatsappMessages);
    const senderOrigin = messages.columns.find(
      (column) => column.name === "sender_origin",
    );

    expect(crmWhatsappMessageSenderOrigin.enumValues).toEqual([
      "customer",
      "human_crm",
      "human_whatsapp",
      "bot_api",
      "system",
      "unknown",
    ]);
    expect(senderOrigin).toMatchObject({
      default: "unknown",
      hasDefault: true,
      notNull: true,
    });
  });

  it("keeps session revisions nonnegative and messages fully scoped", () => {
    const sessions = getTableConfig(crmWhatsappSessions);
    const messages = getTableConfig(crmWhatsappMessages);
    const revision = sessions.columns.find(
      (column) => column.name === "revision",
    );

    expect(revision).toMatchObject({
      default: 0,
      hasDefault: true,
      notNull: true,
    });
    expect(
      sessions.columns.find(
        (column) => column.name === "intervention_history_started_at",
      ),
    ).toMatchObject({
      hasDefault: true,
      notNull: true,
    });
    expect(sessions.checks.map((check) => check.name)).toContain(
      "crm_whatsapp_sessions_revision_nonnegative",
    );
    expect(foreignKeyColumns(sessions)).toContainEqual({
      foreign: ["tenant_id", "store_id", "id"],
      local: ["tenant_id", "store_id", "connection_id"],
      name: "crm_whatsapp_sessions_scoped_connection_fk",
    });
    expect(foreignKeyColumns(messages)).toContainEqual({
      foreign: ["tenant_id", "store_id", "connection_id", "id"],
      local: ["tenant_id", "store_id", "connection_id", "session_id"],
      name: "crm_whatsapp_messages_scoped_session_fk",
    });
  });

  it("models an append-only scoped intervention transition ledger", () => {
    const ledger = getTableConfig(crmWhatsappInterventionLedger);
    const columns = ledger.columns.map((column) => column.name);
    const indexes = ledger.indexes.map((index) => index.config.name);

    expect(columns).toEqual(
      expect.arrayContaining([
        "actor_id",
        "actor_kind",
        "connection_id",
        "idempotency_key",
        "intervention_id",
        "next_state",
        "occurred_at",
        "previous_state",
        "reason",
        "request_fingerprint",
        "session_id",
        "session_revision",
        "source",
        "store_id",
        "tenant_id",
      ]),
    );
    expect(crmWhatsappInterventionActorKind.enumValues).toEqual([
      "user",
      "support",
      "provider",
      "bot",
      "system",
    ]);
    expect(
      ledger.columns.find((column) => column.name === "actor_kind"),
    ).toMatchObject({ notNull: true });
    expect(
      ledger.columns.find((column) => column.name === "request_fingerprint"),
    ).toMatchObject({
      columnType: "PgVarchar",
      length: 128,
      notNull: true,
    });
    expect(ledger.checks.map((check) => check.name)).toEqual(
      expect.arrayContaining([
        "crm_whatsapp_intervention_ledger_revision_positive",
        "crm_whatsapp_intervention_ledger_request_fingerprint_nonempty",
        "crm_whatsapp_intervention_ledger_state_changed",
      ]),
    );
    expect(indexes).toEqual(
      expect.arrayContaining([
        "crm_whatsapp_intervention_ledger_scope_key_unique",
        "crm_whatsapp_intervention_ledger_scope_revision_unique",
        "crm_whatsapp_intervention_ledger_scope_transition_unique",
      ]),
    );
    expect(foreignKeyColumns(ledger)).toEqual(
      expect.arrayContaining([
        {
          foreign: ["tenant_id", "store_id", "id"],
          local: ["tenant_id", "store_id", "connection_id"],
          name: "crm_whatsapp_intervention_ledger_scoped_connection_fk",
        },
        {
          foreign: ["tenant_id", "store_id", "connection_id", "id"],
          local: ["tenant_id", "store_id", "connection_id", "session_id"],
          name: "crm_whatsapp_intervention_ledger_scoped_session_fk",
        },
      ]),
    );
  });

  it("migrates existing CRM rows conservatively before validating scope", () => {
    expect(migrationSql).toContain(
      "ELSE 'unknown'::\"crm_whatsapp_message_sender_origin\"",
    );
    expect(migrationSql).toContain("'sentByActorId'");
    expect(migrationSql).not.toContain(
      "THEN 'human_whatsapp'::\"crm_whatsapp_message_sender_origin\"",
    );
    expect(migrationSql).toContain(
      "session connection scope mismatch or orphan",
    );
    expect(migrationSql).toContain("message session scope mismatch or orphan");
    expect(migrationSql).toContain("NOT VALID");
    expect(migrationSql).toContain(
      'VALIDATE CONSTRAINT "crm_whatsapp_messages_scoped_session_fk"',
    );
    expect(migrationSql).toContain(
      'CREATE TRIGGER "crm_whatsapp_intervention_ledger_append_only_trigger"',
    );
    expect(migrationSql).toContain(
      'CREATE TRIGGER "crm_whatsapp_intervention_ledger_no_truncate_trigger"',
    );
    expect(migrationSql).toContain(
      'BEFORE TRUNCATE ON "crm_whatsapp_intervention_ledger"',
    );
    expect(migrationSql).toContain("FOR EACH STATEMENT");
    expect(migrationSql).toContain(
      'IF NEW."revision" <> OLD."revision" + 1 THEN',
    );
    expect(migrationSql).not.toContain(
      'IF NEW."revision" < OLD."revision" THEN',
    );
    expect(migrationSql).toContain(
      'CREATE CONSTRAINT TRIGGER "crm_whatsapp_session_transition_has_ledger_trigger"',
    );
    expect(migrationSql).toContain(
      'CREATE CONSTRAINT TRIGGER "crm_whatsapp_ledger_revision_not_future_trigger"',
    );
    expect(migrationSql.match(/DEFERRABLE INITIALLY DEFERRED/g)).toHaveLength(
      2,
    );
    expect(migrationSql).toContain(
      'NEW."session_revision" > current_session_revision',
    );
    expect(migrationSql).toContain(
      'ledger."session_revision" = NEW."revision"',
    );
    expect(migrationSql).toContain(
      'ledger."previous_state" IS NOT DISTINCT FROM OLD."human_attendance_state"',
    );
    expect(migrationSql).toContain(
      'ledger."next_state" IS NOT DISTINCT FROM NEW."human_attendance_state"',
    );
    expect(migrationSql).toContain(
      'ADD COLUMN "intervention_history_started_at" timestamp with time zone DEFAULT now() NOT NULL',
    );
  });
});

function foreignKeyColumns(config: ReturnType<typeof getTableConfig>) {
  return config.foreignKeys.map((foreignKey) => {
    const reference = foreignKey.reference();
    return {
      foreign: reference.foreignColumns.map((column) => column.name),
      local: reference.columns.map((column) => column.name),
      name: foreignKey.getName(),
    };
  });
}
