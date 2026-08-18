import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sources = {
  campaignRecipients: read("drizzleCrmWhatsappCampaignRecipients.ts"),
  leadOutcomes: read("drizzleCrmOutcomeRepository.ts"),
  outboundIntents: read("drizzleCrmWhatsappOutboundIntentRepository.ts"),
  references: read("drizzleCrmCanonicalWorkflowReferences.ts"),
  scheduledMessages: read("drizzleCrmWhatsappScheduledMessages.ts"),
  sessionCommands: read("drizzleCrmWhatsappSessionCommandRepository.ts"),
  webhookEffects: read("drizzleCrmWebhookEffects.ts"),
};

describe("canonical CRM workflow DB adapters", () => {
  it("does not reference removed WhatsApp session or message tables", () => {
    for (const source of Object.values(sources)) {
      expect(source).not.toContain("crmWhatsappSessions");
      expect(source).not.toContain("crmWhatsappMessages");
    }
  });

  it("persists outbound intents with canonical cycle, thread, and message semantics", () => {
    expect(sources.outboundIntents).toContain("canonicalMessages");
    expect(sources.outboundIntents).toContain("cycleId: input.sessionId");
    expect(sources.outboundIntents).toContain("threadId: message.threadId");
    expect(sources.outboundIntents).toContain("messageId: input.messageId");
  });

  it("persists schedules and campaign recipients by canonical thread", () => {
    for (const source of [
      sources.scheduledMessages,
      sources.campaignRecipients,
    ]) {
      expect(source).toContain("findCanonicalThreadIdForCycle");
      expect(source).toContain("threadId,");
      expect(source).toContain("sessionId,");
    }
    expect(sources.scheduledMessages).not.toContain(
      "crmWhatsappScheduledMessages.sessionId",
    );
    expect(sources.campaignRecipients).not.toContain(
      "crmWhatsappCampaignRecipients.sessionId",
    );
    expect(sources.scheduledMessages).toContain("sentMessageId");
    expect(sources.campaignRecipients).toContain("replyMessageId");
    expect(sources.campaignRecipients).toContain("sentMessageId");
    expect(sources.references).toContain("conversationCycles.storeId");
    expect(sources.references).toContain("conversationCycles.tenantId");
  });

  it("stages webhook effects with canonical message context", () => {
    expect(sources.references).toContain("canonicalMessages");
    expect(sources.webhookEffects).toContain("findCanonicalMessageContext");
    expect(sources.webhookEffects).toContain("cycleId: input.sessionId");
    expect(sources.webhookEffects).toContain("threadId: message.threadId");
    expect(sources.webhookEffects).toContain("sessionId: row.cycleId");
  });

  it("persists command receipts against canonical cycles and threads", () => {
    expect(sources.sessionCommands).toContain("conversationCommandReceipts");
    expect(sources.sessionCommands).toContain("cycleId: input.sessionId");
    expect(sources.sessionCommands).toContain("threadId,");
    expect(sources.sessionCommands).toContain(
      "cycleRevision: input.sessionRevision",
    );
    expect(sources.sessionCommands).not.toContain(
      "crmWhatsappSessionCommandReceipts",
    );
  });

  it("translates the outcome DTO origin to the canonical cycle column", () => {
    expect(sources.leadOutcomes).toContain("originCycleId: originSessionId");
    expect(sources.leadOutcomes).toContain("toCanonicalChannel(channel)");
    expect(sources.leadOutcomes).toContain("fromCanonicalChannel(row.channel)");
    expect(sources.leadOutcomes).toContain(
      "originSessionId: row.originCycleId",
    );
    expect(sources.leadOutcomes).not.toContain("row.originSessionId");
  });
});

function read(fileName: string) {
  return readFileSync(new URL(fileName, import.meta.url), "utf8");
}
