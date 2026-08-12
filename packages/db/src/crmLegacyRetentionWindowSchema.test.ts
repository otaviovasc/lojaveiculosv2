import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../migrations/0040_crm_legacy_retention_window.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();
const correctionMigration = readFileSync(
  new URL(
    "../migrations/0041_crm_retention_reconciliation_and_receipts.sql",
    import.meta.url,
  ),
  "utf8",
).toLowerCase();

describe("CRM legacy provider retention window migration", () => {
  it("reconciles independent UUIDs through stable provider identifiers", () => {
    expect(correctionMigration).toContain(
      'create or replace view "crm_retention_legacy_coverage"',
    );
    expect(correctionMigration).toContain(
      'thread."provider_connection_id" = session."provider_connection_id"',
    );
    expect(correctionMigration).toContain(
      'thread."external_thread_id" = session."external_thread_id"',
    );
    expect(correctionMigration).toContain(
      "regexp_replace(session.\"buyer_chat_lid\", '\\\\d', '', 'g')",
    );
    expect(correctionMigration).toContain(
      'canonical_message."provider_message_id" = coalesce(message."external_id", message."channel_message_id")',
    );
    expect(correctionMigration).not.toContain(
      'canonical_message."id" = message."id"',
    );
    expect(correctionMigration).not.toContain('cycle."id" = session."id"');
  });

  it("adds bounded candidate indexes for the temporary worker path", () => {
    expect(migration).toContain('"crm_whatsapp_sessions_legacy_retention_idx"');
    expect(migration).toContain('"crm_whatsapp_messages_legacy_retention_idx"');
    expect(migration).toContain("where \"status\" in ('completed', 'expired')");
  });

  it("indexes only retryable sealed OLX lead receipts", () => {
    expect(correctionMigration).toContain(
      '"provider_events_olx_lead_receipt_retention_idx"',
    );
    expect(correctionMigration).toContain(
      "\"status\" in ('received', 'processing', 'failed')",
    );
    expect(correctionMigration).toContain("\"payload\" ? 'sealedreceipt'");
  });
});
