import { describe, expect, it } from "vitest";
import type {
  CrmCampaign,
  CrmCampaignRecipient,
  CrmScheduledMessage,
} from "../../../../domains/crm/ports/crmConversationRepository.js";
import { claimMemoryCampaignReply } from "./crmCampaignReplyMemory.js";

const scope = { storeId: "store-1" as never, tenantId: "tenant-1" as never };

describe("memory CRM campaign reply claim", () => {
  it("claims a pending recipient only after the initial schedule is confirmed sent", async () => {
    const campaign = createCampaign();
    const recipient = createRecipient();
    const scheduled = createScheduledMessage();
    const input = {
      campaignId: campaign.id,
      recipientId: recipient.id,
      replyContentPreview: "Tenho interesse",
      replyMessageId: "reply-1",
      replyReceivedAt: new Date("2030-01-01T10:02:00.000Z"),
      ...scope,
    };

    expect(
      claimMemoryCampaignReply([campaign], [recipient], [], input),
    ).toBeNull();

    const claims = await Promise.all(
      Array.from({ length: 4 }, () =>
        Promise.resolve(
          claimMemoryCampaignReply([campaign], [recipient], [scheduled], input),
        ),
      ),
    );

    expect(claims.filter(Boolean)).toHaveLength(1);
    expect(campaign.repliedCount).toBe(1);
    expect(recipient.status).toBe("replied");
    expect(recipient.replyReceivedAt).toEqual(input.replyReceivedAt);
    expect(recipient.initialSentAt).toBeNull();
    expect(recipient.sentMessageId).toBeNull();
  });

  it("rejects an unconfirmed initial schedule and preserves unrelated reply state", () => {
    const campaign = createCampaign();
    const recipient = createRecipient();
    const unsent = createScheduledMessage({ status: "pending" });

    expect(
      claimMemoryCampaignReply([campaign], [recipient], [unsent], {
        campaignId: campaign.id,
        recipientId: recipient.id,
        replyContentPreview: "Tenho interesse",
        replyMessageId: "reply-1",
        replyReceivedAt: new Date("2030-01-01T10:02:00.000Z"),
        ...scope,
      }),
    ).toBeNull();
    expect(recipient.status).toBe("pending");
    expect(campaign.repliedCount).toBe(0);
  });
});

function createCampaign(): CrmCampaign {
  const now = new Date("2030-01-01T10:00:00.000Z");
  return {
    content: "Hello",
    createdAt: now,
    createdByUserId: null,
    failedCount: 0,
    id: "campaign-1",
    initialTagId: null,
    intervalMinutes: 1,
    mediaFileName: null,
    mediaStorageKey: null,
    mediaType: null,
    mediaUrl: null,
    metadata: {},
    name: "Campaign",
    repliedCount: 0,
    replyRate: 0,
    replyTagId: null,
    scheduledCount: 1,
    scheduledEndAt: now,
    scheduledStartAt: now,
    secondaryContent: null,
    secondaryDelayMinutes: 1,
    secondarySentCount: 0,
    selectedConnectionId: null,
    sentCount: 0,
    status: "scheduled",
    totalRecipients: 1,
    updatedAt: now,
    ...scope,
  };
}

function createRecipient(): CrmCampaignRecipient {
  const now = new Date("2030-01-01T10:00:00.000Z");
  return {
    campaignId: "campaign-1",
    connectionId: "connection-1",
    createdAt: now,
    errorMessage: null,
    id: "recipient-1",
    initialScheduledMessageId: "scheduled-1",
    initialSentAt: null,
    leadId: null,
    recipientAddress: "5511999990001",
    replyContentPreview: null,
    replyMessageId: null,
    replyReceivedAt: null,
    secondaryScheduledMessageId: null,
    secondarySentAt: null,
    sentMessageId: null,
    sequence: 0,
    cycleId: "cycle-1",
    status: "pending",
    updatedAt: now,
    variables: {},
    ...scope,
  };
}

function createScheduledMessage(
  overrides: Partial<CrmScheduledMessage> = {},
): CrmScheduledMessage {
  const now = new Date("2030-01-01T10:00:00.000Z");
  return {
    cancelledAt: null,
    campaignId: "campaign-1",
    campaignMessageType: "initial",
    campaignRecipientKey: "cycle-1",
    campaignSequence: 0,
    connectionId: "connection-1",
    content: "Hello",
    createdAt: now,
    createdByUserId: null,
    errorMessage: null,
    id: "scheduled-1",
    metadata: {},
    recipientAddress: "5511999990001",
    scheduledAt: now,
    sentAt: new Date("2030-01-01T10:01:00.000Z"),
    sentMessageId: "message-1",
    cycleId: "cycle-1",
    status: "sent",
    updatedAt: now,
    ...scope,
    ...overrides,
  };
}
