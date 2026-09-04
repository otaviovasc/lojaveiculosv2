import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  crmRetentionAuditOutbox,
  crmRetentionLegalHolds,
  crmRetentionScopes,
} from "./schema/crmRetention.js";

const securityMigration = readFileSync(
  new URL("../migrations/0034_crm_retention_security.sql", import.meta.url),
  "utf8",
);
const externalBotRetentionMigration = readFileSync(
  new URL("../migrations/0036_crm_external_bot_retention.sql", import.meta.url),
  "utf8",
);

describe("CRM retention schema", () => {
  it("enforces tenant/store scope and constrained legal-hold targets", () => {
    const config = getTableConfig(crmRetentionLegalHolds);
    expect(config.foreignKeys.map((key) => key.getName())).toContain(
      "crm_retention_legal_holds_store_tenant_fk",
    );
    expect(config.checks.map((check) => check.name)).toEqual(
      expect.arrayContaining([
        "crm_retention_legal_holds_category_check",
        "crm_retention_legal_holds_expiry_check",
        "crm_retention_legal_holds_target_check",
      ]),
    );
    expect(config.indexes.map((index) => index.config.name)).toContain(
      "crm_retention_legal_holds_active_scope_idx",
    );
  });

  it("keeps one durable leased cursor per store scope", () => {
    const config = getTableConfig(crmRetentionScopes);
    expect(config.foreignKeys.map((key) => key.getName())).toContain(
      "crm_retention_scopes_store_tenant_fk",
    );
    expect(config.indexes.map((index) => index.config.name)).toEqual(
      expect.arrayContaining([
        "crm_retention_scopes_scope_unique",
        "crm_retention_scopes_claim_idx",
      ]),
    );
  });

  it("persists sanitized audit intents with retry and idempotency", () => {
    const config = getTableConfig(crmRetentionAuditOutbox);
    expect(config.foreignKeys.map((key) => key.getName())).toContain(
      "crm_retention_audit_outbox_store_tenant_fk",
    );
    expect(config.indexes.map((index) => index.config.name)).toEqual(
      expect.arrayContaining([
        "crm_retention_audit_outbox_idempotency_unique",
        "crm_retention_audit_outbox_audit_id_unique",
        "crm_retention_audit_outbox_claim_idx",
      ]),
    );
  });

  it("serializes legal-hold changes with retention mutations", () => {
    expect(securityMigration).toContain(
      "crm_retention_legal_hold_scope_lock_trigger",
    );
    expect(securityMigration).toContain("pg_advisory_xact_lock");
    expect(securityMigration).toContain("hashtextextended");
    expect(securityMigration).toContain("7319");
    expect(securityMigration).toContain("BEFORE INSERT OR UPDATE OR DELETE");
  });

  it("allows delivered and expired external bot grants to be destroyed", () => {
    expect(externalBotRetentionMigration).toContain(
      'ALTER COLUMN "grant_token" DROP NOT NULL',
    );
    expect(externalBotRetentionMigration).toContain('"grant_token" = NULL');
    expect(externalBotRetentionMigration).toContain(
      '"state" = \'delivered\' OR "grant_expires_at" <= now()',
    );
  });
});
import { readFileSync } from "node:fs";
