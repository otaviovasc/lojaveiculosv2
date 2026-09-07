import { readFileSync } from "node:fs";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { crmSpecialDateConfigs, crmSpecialDateExecutions } from "./index.js";

const migrationSql = readFileSync(
  new URL(
    "../migrations/0084_crm_special_dates_and_lead_birth_date.sql",
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

describe("CRM special-date persistence schema", () => {
  it("keeps configuration scoped to one canonical connection", () => {
    const config = getTableConfig(crmSpecialDateConfigs);

    expect(config.foreignKeys.map((key) => key.getName())).toEqual(
      expect.arrayContaining([
        "crm_special_date_configs_store_tenant_fk",
        "crm_special_date_configs_scoped_connection_fk",
      ]),
    );
    expect(config.indexes.map((index) => index.config.name)).toEqual(
      expect.arrayContaining([
        "crm_special_date_configs_connection_type_unique",
        "crm_special_date_configs_store_enabled_idx",
      ]),
    );
    expect(config.checks.map((check) => check.name)).toEqual(
      expect.arrayContaining([
        "crm_special_date_configs_lead_days_chk",
        "crm_special_date_configs_send_time_chk",
        "crm_special_date_configs_revision_chk",
      ]),
    );
  });

  it("deduplicates one canonical recipient per annual scope", () => {
    const execution = getTableConfig(crmSpecialDateExecutions);

    expect(execution.foreignKeys.map((key) => key.getName())).toEqual(
      expect.arrayContaining([
        "crm_special_date_executions_store_tenant_fk",
        "crm_special_date_executions_scoped_connection_fk",
        "crm_special_date_executions_scoped_scheduled_message_fk",
      ]),
    );
    expect(execution.indexes.map((index) => index.config.name)).toContain(
      "crm_special_date_executions_unique",
    );
    expect(execution.checks.map((check) => check.name)).toEqual(
      expect.arrayContaining([
        "crm_special_date_executions_target_year_chk",
        "crm_special_date_executions_status_chk",
        "crm_special_date_executions_recipient_key_chk",
        "crm_special_date_executions_config_revision_chk",
      ]),
    );
  });

  it("registers the birth-date migration after the applied baseline", () => {
    expect(journal.entries.find(({ idx }) => idx === 84)?.tag).toBe(
      "0084_crm_special_dates_and_lead_birth_date",
    );
    expect(migrationSql).toContain(
      'ALTER TABLE "leads" ADD COLUMN "birth_date" date',
    );
    expect(migrationSql).toContain(
      'CREATE UNIQUE INDEX "crm_special_date_executions_unique"',
    );
    expect(migrationSql).toContain(
      'REFERENCES "public"."crm_channel_connections"("tenant_id","store_id","id")',
    );
  });
});
