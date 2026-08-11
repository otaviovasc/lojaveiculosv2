import { readFileSync } from "node:fs";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  crmConnectionProvider,
  crmConnections,
  crmWhatsappChannel,
} from "./index.js";

const migrationSql = readFileSync(
  new URL("../migrations/0023_crm_olx_chat_provider.sql", import.meta.url),
  "utf8",
).trim();
const exchangeLeaseMigrationSql = readFileSync(
  new URL(
    "../migrations/0029_marketplace_oauth_exchange_lease.sql",
    import.meta.url,
  ),
  "utf8",
).trim();

describe("CRM OLX provider schema", () => {
  it("publishes olx_chat as a first-class provider while retaining OLX_CHAT", () => {
    expect(crmConnectionProvider.enumValues).toContain("olx_chat");
    expect(crmWhatsappChannel.enumValues).toContain("OLX_CHAT");
  });

  it("adds only the olx_chat provider enum value", () => {
    expect(migrationSql).toBe(
      'ALTER TYPE "public"."crm_connection_provider" ADD VALUE \'olx_chat\';',
    );
    expect(migrationSql).not.toContain("crm_whatsapp_channel");
  });

  it("enforces one active connection without using the new enum value in the migration transaction", () => {
    expect(exchangeLeaseMigrationSql).toContain(
      `WHERE "status" <> 'archived' AND "provider" <> 'composio_instagram';`,
    );
    expect(exchangeLeaseMigrationSql).not.toContain(
      `"provider" IN ('zapi', 'composio_whatsapp', 'olx_chat')`,
    );

    const index = getTableConfig(crmConnections).indexes.find(
      ({ config }) =>
        config.name === "crm_connections_store_provider_active_unique",
    );
    const predicate = new PgDialect()
      .sqlToQuery(index?.config.where ?? fail("Missing active-provider index"))
      .sql.toLowerCase();

    expect(predicate).toContain(`"crm_connections"."status" <> 'archived'`);
    expect(predicate).toContain(
      `"crm_connections"."provider" <> 'composio_instagram'`,
    );
  });
});

function fail(message: string): never {
  throw new Error(message);
}
