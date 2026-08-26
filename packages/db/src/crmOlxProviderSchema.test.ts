import { readFileSync } from "node:fs";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  messagingChannel,
  crmChannelConnections,
  transportProvider,
} from "./index.js";

const legacyMigration = readFileSync(
  new URL("../migrations/0023_crm_olx_chat_provider.sql", import.meta.url),
  "utf8",
);
const canonicalMigration = readFileSync(
  new URL("../migrations/0031_crm_core_canonical.sql", import.meta.url),
  "utf8",
);
const cutoverMigration = readFileSync(
  new URL(
    "../migrations/0058_canonical_crm_operational_cutover.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("CRM OLX provider schema", () => {
  it("models OLX Chat through canonical channel and provider enums", () => {
    expect(messagingChannel.enumValues).toContain("olx_chat");
    expect(transportProvider.enumValues).toContain("olx");
    expect(
      getTableConfig(crmChannelConnections).checks.map(({ name }) => name),
    ).toContain("crm_channel_connections_supported_triple_check");
  });

  it("retains immutable migration history but drops its legacy provider type", () => {
    expect(legacyMigration.trim()).toBe(
      'ALTER TYPE "public"."crm_connection_provider" ADD VALUE \'olx_chat\';',
    );
    expect(cutoverMigration).toContain(
      'DROP TYPE "public"."crm_connection_provider"',
    );
  });

  it("commits the legacy OLX enum value before the canonical migration uses it", () => {
    expect(canonicalMigration).toMatch(
      /^-- PostgreSQL requires enum values[\s\S]*COMMIT;--> statement-breakpoint\nBEGIN;--> statement-breakpoint/,
    );
    expect(canonicalMigration).toContain(
      "WHERE connection.\"provider\" <> 'olx_chat'",
    );
  });
});
