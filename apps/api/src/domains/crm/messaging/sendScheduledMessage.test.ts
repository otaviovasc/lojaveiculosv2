import { describe, expect, it, vi } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import type { CrmScheduledMessage } from "../ports/crmConversationRepository.js";
import type { CrmConnection } from "../ports/crmConnectionRepository.js";
import type { CrmMessagingGateway } from "../ports/crmMessagingGateway.js";
import type { CrmServicePorts } from "../services/CrmService/types.js";
import type {
  PreparedOutboundCrmMessage,
  SendOutboundMessageInput,
} from "./outboundMessageTypes.js";
import { fingerprintOutboundIntent } from "./outboundMessageSupport.js";

const { sendOutboundMessage } = vi.hoisted(() => ({
  sendOutboundMessage: vi.fn(),
}));

vi.mock("./sendOutboundMessage.js", () => ({ sendOutboundMessage }));

import { sendScheduledMessage } from "./sendScheduledMessage.js";

const context = createServiceContext({
  actor: { id: "worker-1", kind: "system" },
  entitlements: ["crm"],
  permissions: ["crm.messages.send"],
  request: { requestId: "scheduled-message-test" },
  storeId: "store-1",
  tenantId: "tenant-1",
});

const connection = {
  broker: "direct",
  channel: "whatsapp",
  credentialsRef: {},
  displayName: "Test",
  externalConnectionId: "external-1",
  externalInstanceId: "instance-1",
  id: "connection-1",
  metadata: {},
  phone: "+5511999999999",
  provider: "uazapi",
  status: "active",
  storeId: "store-1" as never,
  tenantId: "tenant-1" as never,
  webhookUrl: null,
} satisfies CrmConnection;

function scheduledMessage(
  metadata: Record<string, unknown> = {},
): CrmScheduledMessage {
  const now = new Date("2026-09-07T12:00:00.000Z");
  return {
    cancelledAt: null,
    campaignId:
      typeof metadata.campaignId === "string" ? metadata.campaignId : null,
    campaignMessageType: null,
    campaignRecipientKey: null,
    campaignSequence: null,
    connectionId: connection.id,
    createdAt: now,
    createdByUserId: null,
    cycleId: "cycle-1",
    errorMessage: null,
    id: "scheduled-1",
    metadata,
    recipientAddress: "stored-address",
    scheduledAt: now,
    sentAt: null,
    sentMessageId: null,
    status: "pending",
    storeId: connection.storeId,
    tenantId: connection.tenantId,
    content: "Hello",
    updatedAt: now,
  };
}

describe("sendScheduledMessage", () => {
  it("uses a stable scheduled intent and the provider-resolved address", async () => {
    let receivedInput: SendOutboundMessageInput | undefined;
    let preparedResult: PreparedOutboundCrmMessage | undefined;
    sendOutboundMessage.mockImplementation(
      async (_context: typeof context, input: SendOutboundMessageInput) => {
        receivedInput = input;
        preparedResult = await input.prepare({
          connection,
          gateway: {
            sendText: vi.fn().mockResolvedValue({
              externalId: "provider-message-1",
              providerTimestamp: new Date("2026-09-07T12:01:00.000Z"),
            }),
          } as unknown as CrmMessagingGateway,
          phone: "provider-address",
          scope: { storeId: "store-1", tenantId: "tenant-1" },
          conversationCycle: {
            customerPhone: "canonical-cycle-address",
          } as never,
        });
        return { id: "message-1", prepared: preparedResult };
      },
    );

    await sendScheduledMessage(
      context,
      scheduledMessage({ campaignId: "campaign-1" }),
      {} as CrmServicePorts,
    );

    expect(sendOutboundMessage).toHaveBeenCalledWith(
      context,
      expect.objectContaining({ cycleId: "cycle-1" }),
      expect.anything(),
    );
    expect(receivedInput).toMatchObject({
      cycleId: "cycle-1",
      idempotencyKey: "scheduled:scheduled-1",
      idempotencyPayload: {
        cycleId: "cycle-1",
        replyToMessageId: null,
        text: "Hello",
      },
      senderOrigin: "system",
      senderType: "SYSTEM",
    });
    expect(
      fingerprintOutboundIntent({
        payload: receivedInput?.idempotencyPayload,
        senderOrigin: receivedInput?.senderOrigin,
        senderType: receivedInput?.senderType,
      }),
    ).toBe(
      fingerprintOutboundIntent({
        payload: {
          replyToMessageId: null,
          cycleId: "cycle-1",
          text: "Hello",
        },
        senderOrigin: "system",
        senderType: "SYSTEM",
      }),
    );
    expect(preparedResult).toMatchObject({
      sent: { externalId: "provider-message-1" },
      type: "TEXT",
    });
  });

  it("uses the immutable managed asset and caption in a media fingerprint", async () => {
    let receivedInput: SendOutboundMessageInput | undefined;
    sendOutboundMessage.mockImplementation(
      async (_context: typeof context, input: SendOutboundMessageInput) => {
        receivedInput = input;
        return { id: "message-media" };
      },
    );

    await sendScheduledMessage(
      context,
      scheduledMessage({
        campaignId: "campaign-1",
        mediaFileName: "promo.png",
        mediaStorageKey: "crm/campaigns/promo.png",
        mediaType: "image/png",
        mediaUrl: "https://storage.example/promo.png",
      }),
      {} as CrmServicePorts,
    );

    expect(receivedInput).toMatchObject({
      idempotencyPayload: {
        caption: "Hello",
        cycleId: "cycle-1",
        fileName: "promo.png",
        mediaStorageKey: "crm/campaigns/promo.png",
        mediaType: "image",
        mediaUrl: null,
      },
      requiredCapabilities: ["outbound", "media"],
    });
    expect(
      fingerprintOutboundIntent({
        payload: receivedInput?.idempotencyPayload,
        senderOrigin: receivedInput?.senderOrigin,
        senderType: receivedInput?.senderType,
      }),
    ).not.toBe(
      fingerprintOutboundIntent({
        payload: {
          replyToMessageId: null,
          cycleId: "cycle-1",
          text: "Hello",
        },
        senderOrigin: "system",
        senderType: "SYSTEM",
      }),
    );
  });

  it("requires a managed storage reference for campaign media", async () => {
    sendOutboundMessage.mockClear();

    await expect(
      sendScheduledMessage(
        context,
        scheduledMessage({
          campaignId: "campaign-1",
          mediaType: "image",
          mediaUrl: "https://storage.example/image.png",
        }),
        {} as CrmServicePorts,
      ),
    ).rejects.toThrow("managed storage reference");
    expect(sendOutboundMessage).not.toHaveBeenCalled();
  });
});
