import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { UpdateCrmConversationCycleInput } from "../../../domains/crm/ports/crmConversationRepository.js";
import {
  toCanonicalChannel,
  toCrmMessage,
} from "./drizzleCrmConversationMappers.js";
import {
  toCanonicalSender,
  toCanonicalSenderOrigin,
} from "./drizzleCrmMessages.js";
import { cleanSessionUpdate } from "./drizzleCrmConversationUpdates.js";

const cutoverModules = [
  "drizzleCrmConversationRepository.ts",
  "drizzleCrmAttendance.ts",
  "drizzleCrmConversationIngest.ts",
  "drizzleCrmConversationMappers.ts",
  "drizzleCrmMessages.ts",
  "drizzleCrmConversationQueries.ts",
  "drizzleCrmConversationCycleIdentity.ts",
  "drizzleCrmConversationCyclePreview.ts",
  "drizzleCrmConversationCycleTags.ts",
  "drizzleCrmTagHydration.ts",
  "drizzleCrmTags.ts",
  "drizzleCrmConversationUpdates.ts",
] as const;

describe("Drizzle CRM canonical cutover", () => {
  it("does not import or reference legacy WhatsApp session, message, tag, or attendance tables", () => {
    for (const moduleName of cutoverModules) {
      const source = readFileSync(
        fileURLToPath(new URL(moduleName, import.meta.url)),
        "utf8",
      );
      expect(source).not.toMatch(
        /crmWhatsapp(?:Sessions|Messages|SessionTags|InterventionLedger)|crm_whatsapp_(?:sessions|messages|session_tags|intervention_ledger)/,
      );
    }
  });

  it("does not encode attendance idempotency receipts in cycle metadata", () => {
    const input: UpdateCrmConversationCycleInput & {
      idempotencyKey: string;
      requestFingerprint: string;
    } = {
      idempotencyKey: "attendance:intervention:none:IN_HUMAN_SERVICE",
      requestFingerprint: "fingerprint-1",
      cycleId: "cycle-1",
      storeId: "store-1" as never,
      tenantId: "tenant-1" as never,
    };

    expect(cleanSessionUpdate(input).metadata).toEqual({});
  });

  it("maps every supported canonical channel", () => {
    expect(toCanonicalChannel("WHATSAPP")).toBe("whatsapp");
    expect(toCanonicalChannel("INSTAGRAM")).toBe("instagram");
    expect(toCanonicalChannel("OLX_CHAT")).toBe("olx_chat");
  });

  it("round-trips provider sender semantics without coercing known values", () => {
    expect(toCanonicalSender("AI")).toBe("bot");
    expect(toCanonicalSenderOrigin("external_bot")).toBe("external_bot");
    expect(toCanonicalSenderOrigin("human_channel")).toBe("human_channel");

    const occurredAt = new Date("2026-08-18T12:00:00.000Z");
    expect(
      toCrmMessage({
        channel: "instagram",
        content: "reaction payload",
        createdAt: occurredAt,
        cycleId: "cycle-1",
        deletedAt: null,
        direction: "outbound",
        id: "message-1",
        mediaType: null,
        mediaUrl: null,
        messageType: "TEXT",
        metadata: {
          channelMessageId: "channel-1",
          providerMetadata: { reaction: "heart" },
        },
        occurredAt,
        provider: "meta_cloud",
        providerConnectionId: "connection-1",
        providerMessageId: "provider-1",
        revision: 0,
        sender: "human",
        senderOrigin: "human_channel",
        status: "read",
        storeId: "store-1",
        tenantId: "tenant-1",
        threadId: "thread-1",
        updatedAt: occurredAt,
      }),
    ).toMatchObject({
      channel: "INSTAGRAM",
      channelMessageId: "channel-1",
      direction: "OUTBOUND",
      externalId: "provider-1",
      metadata: { reaction: "heart" },
      providerTimestamp: occurredAt,
      senderOrigin: "human_channel",
      senderType: "HUMAN",
      cycleId: "cycle-1",
      status: "READ",
      type: "TEXT",
    });
  });
});
