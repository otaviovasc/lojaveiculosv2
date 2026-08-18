import { describe, expect, it } from "vitest";
import { findLegacyCrmRuntimeReferences } from "./canonical-crm-runtime-rules.mjs";

describe("canonical CRM runtime rules", () => {
  it("rejects legacy SQL tables and schema symbols", () => {
    const findings = findLegacyCrmRuntimeReferences(
      [
        "select * from crm_connections",
        'assertPermission(context, "crm.whatsapp.send")',
        "repository.insert(crmWhatsappSessions)",
        "delete from crm_whatsapp_intervention_ledger",
      ].join("\n"),
    );

    expect(findings).toEqual([
      { line: 1, term: "crm_connections" },
      { line: 2, term: "crm.whatsapp." },
      { line: 3, term: "crmWhatsappSessions" },
      { line: 4, term: "crm_whatsapp_intervention_ledger" },
    ]);
  });

  it("rejects stale channel-neutral and external-bot aliases", () => {
    const findings = findLegacyCrmRuntimeReferences(
      [
        "insert into crm_whatsapp_scheduled_messages",
        "repository: CrmWhatsappRepository",
        "from bot_action_commands",
        "provider: composio_instagram",
        "route: /whatsapp/sessions/:sessionId",
        "buyerChatLid: thread.customerChannelIdentity",
        "route: /whatsapp/send/text",
        'senderOrigin: "bot_api"',
        'senderOrigin: "human_whatsapp"',
        'entityType: "crm_whatsapp_campaign"',
      ].join("\n"),
    );

    expect(findings).toEqual([
      { line: 1, term: "crm_whatsapp_scheduled_messages" },
      { line: 2, term: "CrmWhatsappRepository" },
      { line: 3, term: "bot_action_commands" },
      { line: 4, term: "composio_instagram" },
      { line: 5, term: "/whatsapp/sessions" },
      { line: 6, term: "buyerChatLid" },
      { line: 7, term: "/whatsapp/send/text" },
      { line: 8, term: '"bot_api"' },
      { line: 9, term: '"human_whatsapp"' },
      { line: 10, term: '"crm_whatsapp_campaign"' },
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
          "crm_external_bot_grants",
          "crm_external_bot_action_commands",
          "crm_external_bot_provider_effects",
        ].join("\n"),
      ),
    ).toEqual([]);
  });
});
