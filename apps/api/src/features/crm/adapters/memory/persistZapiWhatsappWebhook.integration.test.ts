import { describe, expect, it, vi } from "vitest";
import type { CrmServicePorts } from "../../../../domains/crm/services/CrmService/serviceSupport.js";
import { createTestCrmConversationCycle } from "../../../../domains/crm/testSupportWhatsapp.js";
import { persistZapiCanonicalInbound } from "../../../../domains/crm/whatsapp/persistZapiCanonicalInbound.js";
import { persistZapiWhatsappWebhook } from "../../../../domains/crm/whatsapp/persistZapiWhatsappWebhook.js";
import { createMemoryCrmCanonicalInboundRepository } from "./crmCanonicalInboundRepository.js";
import { createMemoryCrmPipelineRepository } from "./crmPipelineRepository.js";
import { createMemoryCrmRepository } from "./crmRepository.js";
import { createMemoryCrmConversationRepository } from "./crmConversationRepository.js";
import {
  connection,
  context,
  lead,
  message,
  projectedMessage,
} from "./persistZapiWhatsappWebhook.testSupport.js";

describe("persistZapiWhatsappWebhook canonical inbound", () => {
  it("persists media, cycle, attendance, and message without legacy writes", async () => {
    const canonical = createMemoryCrmCanonicalInboundRepository();
    const crmRepository = createMemoryCrmRepository();
    const whatsappRepository = createMemoryCrmConversationRepository();
    const ingestMessage = vi.spyOn(whatsappRepository, "ingestMessage");
    const upsertConversationCycleContext = vi.spyOn(
      whatsappRepository,
      "upsertConversationCycleContext",
    );
    const canonicalRepository = {
      async ingestInboundMessage(
        input: Parameters<typeof canonical.ingestInboundMessage>[0],
      ) {
        const result = await canonical.ingestInboundMessage(input);
        return { ...result, createdConversationCycle: result.created };
      },
    };
    vi.spyOn(whatsappRepository, "findMessageByExternalId").mockImplementation(
      async () => projectedMessage(canonical.snapshot().messages[0]),
    );
    vi.spyOn(whatsappRepository, "listConversationCycles").mockImplementation(
      async () => {
        const [persistedLead] = await crmRepository.listLeads({
          limit: 1,
          storeId: connection().storeId,
          tenantId: connection().tenantId,
        });
        return canonical.snapshot().cycles.map((cycle) =>
          createTestCrmConversationCycle({
            assignedUserId: "assigned-user" as never,
            id: cycle.id,
            leadId: persistedLead?.id ?? null,
            messageCount: canonical.snapshot().messages.length,
            revision: 7,
            tags: [
              {
                color: "#64748b",
                connectionId: null,
                emoji: null,
                id: "tag-1",
                name: "VIP",
                sortOrder: 0,
                storeId: connection().storeId,
                tenantId: connection().tenantId,
              },
            ],
            unreadCount: canonical.snapshot().messages.length,
          }),
        );
      },
    );
    const ports = {
      crmCanonicalInboundRepository: canonicalRepository,
      crmPipelineRepository: createMemoryCrmPipelineRepository(),
      crmRepository,
      crmConversationRepository: whatsappRepository,
    } satisfies CrmServicePorts;
    const input = {
      attribution: null,
      connection: connection(),
      detectedAt: new Date("2026-08-18T12:00:01.000Z"),
      media: {
        mediaUrl: "https://cdn.test/car.jpg",
        metadata: {
          media: { mirrorStatus: "stored", storageKey: "crm/car.jpg" },
        },
      },
      parsed: message({
        profilePhotoUrl: "https://zapi.test/profiles/buyer.jpg",
      }),
      profilePhoto: { status: "unavailable" as const },
    };

    const first = await persistZapiWhatsappWebhook(context(), input, ports);
    const duplicate = await persistZapiWhatsappWebhook(context(), input, ports);
    const snapshot = canonical.snapshot();

    expect(first.result.createdMessage).toBe(true);
    expect(duplicate.result.createdMessage).toBe(false);
    expect(first.result).toMatchObject({
      createdConversationCycle: true,
      conversationCycle: {
        assignedUserId: "assigned-user",
        messageCount: 1,
        revision: 7,
        tags: [{ name: "VIP" }],
        unreadCount: 1,
      },
    });
    expect(snapshot).toMatchObject({
      attendances: [{ state: "bot_active" }],
      cycles: [{ state: "active" }],
      messages: [
        {
          mediaType: "image",
          mediaUrl: "https://cdn.test/car.jpg",
          metadata: {
            media: { mirrorStatus: "stored", storageKey: "crm/car.jpg" },
          },
          providerMessageId: "zapi-message-1",
        },
      ],
    });
    expect(snapshot.threads).toHaveLength(1);
    expect(snapshot.messages[0]?.profilePhotoUrl).toBe(
      "https://zapi.test/profiles/buyer.jpg",
    );
    expect(ingestMessage).not.toHaveBeenCalled();
    expect(upsertConversationCycleContext).not.toHaveBeenCalled();
    await expect(
      crmRepository.listActivities({
        leadId: first.result.conversationCycle.leadId ?? "",
        limit: 10,
        storeId: connection().storeId,
        tenantId: connection().tenantId,
      }),
    ).resolves.toHaveLength(1);
  });

  it("keeps a LID-only identity provider-scoped", async () => {
    const ingestInboundMessage = vi.fn(async () => ({
      attendanceState: "bot_active" as const,
      contactId: "contact-1",
      created: true,
      createdConversationCycle: true,
      cycleId: "cycle-1",
      identityId: "identity-1",
      messageId: "message-1",
      threadId: "thread-1",
    }));
    const connectionValue = connection();

    await persistZapiCanonicalInbound(
      {
        crmCanonicalInboundRepository: { ingestInboundMessage },
      } as unknown as CrmServicePorts,
      {
        attribution: null,
        connection: connectionValue,
        lead: lead(),
        media: { metadata: {} },
        message: message({ chatLid: "123456789@lid", phone: "123456789" }),
        profilePhoto: { status: "unavailable" },
      },
    );

    expect(ingestInboundMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        externalThreadId: "lid:123456789@lid",
        identity: {
          kind: "provider_subject",
          normalizedValue: `zapi:${connectionValue.id}:123456789@lid`,
        },
      }),
    );
  });
});
