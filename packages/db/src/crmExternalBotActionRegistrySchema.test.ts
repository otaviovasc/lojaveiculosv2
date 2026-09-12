import { readFile } from "node:fs/promises";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  crmAppointments,
  crmExternalBotInternalEffects,
  crmTasks,
} from "./index.js";

describe("external bot action registry persistence", () => {
  it("keeps internal receipts separate from provider effects", () => {
    const config = getTableConfig(crmExternalBotInternalEffects);
    expect(config.name).toBe("crm_external_bot_internal_effects");
    expect(config.indexes.map((index) => index.config.name)).toEqual(
      expect.arrayContaining([
        "crm_external_bot_internal_effects_command_unique",
        "crm_external_bot_internal_effects_idempotency_unique",
      ]),
    );
  });

  it.each([
    [crmTasks, "crm_tasks_state_check", "crm_tasks_scoped_command_fk"],
    [
      crmAppointments,
      "crm_appointments_state_check",
      "crm_appointments_scoped_command_fk",
    ],
  ] as const)(
    "fences scoped canonical work rows",
    (table, check, foreignKey) => {
      const config = getTableConfig(table);
      expect(config.checks.map((candidate) => candidate.name)).toContain(check);
      expect(
        config.foreignKeys.map((candidate) => candidate.getName()),
      ).toContain(foreignKey);
    },
  );

  it("uses canonical store scope order in migration 0062", async () => {
    const migration = await readFile(
      new URL(
        "../migrations/0062_external_bot_action_registry_effects.sql",
        import.meta.url,
      ),
      "utf8",
    );
    expect(
      migration.match(
        /FOREIGN KEY \("store_id", "tenant_id"\) REFERENCES "stores"\("id", "tenant_id"\)/g,
      ),
    ).toHaveLength(3);
    expect(migration).not.toContain(
      'FOREIGN KEY ("tenant_id", "store_id") REFERENCES "stores"',
    );
  });
});
