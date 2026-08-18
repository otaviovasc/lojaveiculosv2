import { describe, expect, it } from "vitest";
import { findLegacyCrmRuntimeReferences } from "./canonical-crm-runtime-rules.mjs";

describe("canonical CRM runtime rules", () => {
  it("rejects legacy SQL tables and schema symbols", () => {
    const findings = findLegacyCrmRuntimeReferences(
      [
        "select * from crm_connections",
        "repository.insert(crmWhatsappSessions)",
        "delete from crm_whatsapp_intervention_ledger",
      ].join("\n"),
    );

    expect(findings).toEqual([
      { line: 1, term: "crm_connections" },
      { line: 2, term: "crmWhatsappSessions" },
      { line: 3, term: "crm_whatsapp_intervention_ledger" },
    ]);
  });

  it("allows canonical persistence names", () => {
    expect(
      findLegacyCrmRuntimeReferences(
        [
          "crm_channel_connections",
          "crm_conversation_threads",
          "crm_conversation_cycles",
          "crm_conversation_attendances",
          "crm_messages",
        ].join("\n"),
      ),
    ).toEqual([]);
  });
});
