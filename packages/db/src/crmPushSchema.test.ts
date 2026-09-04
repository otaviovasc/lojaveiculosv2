import { readFileSync } from "node:fs";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  conversationCycles,
  crmPushNotificationOutbox,
  crmPushPreferences,
  crmPushSubscriptions,
} from "./index.js";

const migrationSql = readFileSync(
  new URL("../migrations/0068_crm_push_notifications.sql", import.meta.url),
  "utf8",
);
const journal = JSON.parse(
  readFileSync(
    new URL("../migrations/meta/_journal.json", import.meta.url),
    "utf8",
  ),
) as { entries: { idx: number; tag: string }[] };

const columnNames = (table: Parameters<typeof getTableConfig>[0]) =>
  getTableConfig(table).columns.map(({ name }) => name);

describe("CRM push schema", () => {
  it("owns browser subscriptions globally per OneSignal subscription", () => {
    const config = getTableConfig(crmPushSubscriptions);

    expect(config.name).toBe("crm_push_subscriptions");
    expect(columnNames(crmPushSubscriptions)).toEqual(
      expect.arrayContaining([
        "id",
        "created_at",
        "updated_at",
        "user_id",
        "subscription_id",
        "enabled",
        "last_seen_at",
      ]),
    );
    expect(
      config.indexes.find(
        ({ config: index }) =>
          index.name === "crm_push_subscriptions_subscription_id_unique",
      )?.config.unique,
    ).toBe(true);
  });

  it("scopes preferences to an existing store membership", () => {
    const config = getTableConfig(crmPushPreferences);

    expect(config.foreignKeys.map((key) => key.getName())).toEqual(
      expect.arrayContaining([
        "crm_push_preferences_store_tenant_fk",
        "crm_push_preferences_scoped_membership_fk",
      ]),
    );
    expect(
      config.indexes.find(
        ({ config: index }) =>
          index.name === "crm_push_preferences_scope_user_unique",
      )?.config.unique,
    ).toBe(true);
  });

  it("binds each durable intent to one scoped message and unread generation", () => {
    const config = getTableConfig(crmPushNotificationOutbox);

    expect(config.foreignKeys.map((key) => key.getName())).toEqual(
      expect.arrayContaining([
        "crm_push_notification_outbox_store_tenant_fk",
        "crm_push_notification_outbox_scoped_thread_fk",
        "crm_push_notification_outbox_semantic_cycle_fk",
        "crm_push_notification_outbox_semantic_message_fk",
      ]),
    );
    expect(config.indexes.map(({ config: index }) => index.name)).toEqual(
      expect.arrayContaining([
        "crm_push_notification_outbox_cycle_generation_unique",
        "crm_push_notification_outbox_idempotency_key_unique",
        "crm_push_notification_outbox_claim_idx",
      ]),
    );
    expect(config.checks.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        "crm_push_notification_outbox_state_check",
        "crm_push_notification_outbox_attempt_count_nonnegative",
        "crm_push_notification_outbox_generation_nonnegative",
        "crm_push_notification_outbox_lease_state_check",
        "crm_push_notification_outbox_delivery_state_check",
        "crm_push_notification_outbox_dead_letter_state_check",
      ]),
    );
    expect(columnNames(crmPushNotificationOutbox)).not.toEqual(
      expect.arrayContaining(["content", "customer_phone", "payload"]),
    );
  });

  it("tracks a nonnegative push generation on each conversation cycle", () => {
    const config = getTableConfig(conversationCycles);

    expect(conversationCycles.pushNotificationGeneration).toMatchObject({
      hasDefault: true,
      notNull: true,
    });
    expect(config.checks.map(({ name }) => name)).toContain(
      "conversation_cycles_push_notification_generation_nonnegative",
    );
  });

  it("registers an additive migration without copying V1 data or secrets", () => {
    expect(migrationSql).toContain(
      'CREATE TABLE "crm_push_notification_outbox"',
    );
    expect(migrationSql).toContain(
      'ADD COLUMN "push_notification_generation" integer DEFAULT 0 NOT NULL',
    );
    expect(migrationSql).toContain(
      'CONSTRAINT "crm_push_notification_outbox_semantic_message_fk"',
    );
    expect(migrationSql).not.toMatch(/^(?:INSERT INTO|UPDATE|DELETE FROM)\b/im);
    expect(migrationSql).not.toContain("ONESIGNAL_API_KEY");
    expect(
      journal.entries.find(
        (entry) => entry.tag === "0068_crm_push_notifications",
      ),
    ).toEqual({
      idx: 68,
      tag: "0068_crm_push_notifications",
      version: "7",
      when: 1787788800000,
      breakpoints: true,
    });
  });
});
