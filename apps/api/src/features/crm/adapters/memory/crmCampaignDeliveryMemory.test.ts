import { describe, expect, it } from "vitest";
import type {
  CrmCampaign,
  CrmCampaignRecipient,
} from "../../../../domains/crm/ports/crmConversationRepository.js";
import { recordMemoryCampaignDelivery } from "./crmCampaignDeliveryMemory.js";

const scope = { storeId: "store-1" as never, tenantId: "tenant-1" as never };

describe("memory CRM campaign delivery bookkeeping", () => {
  it("repairs a lost initial-send counter on retry without incrementing twice", async () => {
    const campaign = createCampaign();
    const recipient = createRecipient();
    const campaigns = [campaign];
    const recipients = [recipient];
    const input = {
      campaignId: campaign.id,
      campaignMessageType: "initial",
      campaignRecipientKey: recipient.cycleId,
      campaignSequence: recipient.sequence,
      sentAt: new Date("2030-01-01T10:01:00.000Z"),
      sentMessageId: "message-1",
      ...scope,
    };

    recordMemoryCampaignDelivery(campaigns, recipients, input);
    campaign.sentCount = 0;
    await Promise.all(
      Array.from({ length: 4 }, () =>
        Promise.resolve(
          recordMemoryCampaignDelivery(campaigns, recipients, input),
        ),
      ),
    );

    expect(recipient.status).toBe("sent");
    expect(campaign.sentCount).toBe(1);
  });

  it("preserves replied state while repairing the initial delivery marker", () => {
    const campaign = createCampaign();
    const recipient = createRecipient({
      replyContentPreview: "Tenho interesse",
      replyMessageId: "reply-1",
      replyReceivedAt: new Date("2030-01-01T10:02:00.000Z"),
      status: "replied",
    });

    recordMemoryCampaignDelivery([campaign], [recipient], {
      campaignId: campaign.id,
      campaignMessageType: "initial",
      campaignRecipientKey: recipient.cycleId,
      campaignSequence: recipient.sequence,
      sentAt: new Date("2030-01-01T10:01:00.000Z"),
      sentMessageId: "message-1",
      ...scope,
    });

    expect(recipient.status).toBe("replied");
    expect(recipient.replyMessageId).toBe("reply-1");
    expect(recipient.initialSentAt).toEqual(
      new Date("2030-01-01T10:01:00.000Z"),
    );
    expect(campaign.sentCount).toBe(1);
  });

  it("counts a failed result once and does not replace a later confirmed delivery", () => {
    const campaign = createCampaign();
    const recipient = createRecipient();
    const input = {
      campaignId: campaign.id,
      campaignMessageType: "initial",
      campaignRecipientKey: recipient.cycleId,
      campaignSequence: recipient.sequence,
      errorMessage: "provider unavailable",
      ...scope,
    };

    recordMemoryCampaignDelivery([campaign], [recipient], input);
    recordMemoryCampaignDelivery([campaign], [recipient], input);
    expect(recipient.status).toBe("failed");
    expect(campaign.failedCount).toBe(1);

    recordMemoryCampaignDelivery([campaign], [recipient], {
      campaignId: campaign.id,
      campaignMessageType: "initial",
      campaignRecipientKey: recipient.cycleId,
      campaignSequence: recipient.sequence,
      sentAt: new Date("2030-01-01T10:01:00.000Z"),
      sentMessageId: "message-1",
      ...scope,
    });
    expect(recipient.status).toBe("sent");
    expect(campaign.sentCount).toBe(1);
    expect(campaign.failedCount).toBe(1);
  });

  it("preserves replied state when a secondary delivery completes", () => {
    const campaign = createCampaign();
    const recipient = createRecipient({ status: "replied" });

    recordMemoryCampaignDelivery([campaign], [recipient], {
      campaignId: campaign.id,
      campaignMessageType: "secondary",
      campaignRecipientKey: recipient.cycleId,
      campaignSequence: recipient.sequence,
      sentAt: new Date("2030-01-01T10:03:00.000Z"),
      sentMessageId: "message-2",
      ...scope,
    });
    recordMemoryCampaignDelivery([campaign], [recipient], {
      campaignId: campaign.id,
      campaignMessageType: "secondary",
      campaignRecipientKey: recipient.cycleId,
      campaignSequence: recipient.sequence,
      sentAt: new Date("2030-01-01T10:03:00.000Z"),
      sentMessageId: "message-2",
      ...scope,
    });

    expect(recipient.status).toBe("replied");
    expect(recipient.secondarySentAt).toEqual(
      new Date("2030-01-01T10:03:00.000Z"),
    );
    expect(campaign.secondarySentCount).toBe(1);
  });

  it("keeps a secondary failure visible when a late initial receipt is replayed", () => {
    const campaign = createCampaign();
    const recipient = createRecipient({
      replyReceivedAt: new Date("2030-01-01T10:02:00.000Z"),
      secondaryScheduledMessageId: "secondary-schedule-1",
      status: "replied",
    });
    const failure = {
      campaignId: campaign.id,
      campaignMessageType: "secondary",
      campaignRecipientKey: recipient.cycleId,
      campaignSequence: recipient.sequence,
      errorMessage: "secondary provider unavailable",
      ...scope,
    };

    recordMemoryCampaignDelivery([campaign], [recipient], failure);
    expect(recipient.status).toBe("failed");
    expect(recipient.replyReceivedAt).toBeTruthy();
    expect(campaign.failedCount).toBe(1);

    recordMemoryCampaignDelivery([campaign], [recipient], {
      campaignId: campaign.id,
      campaignMessageType: "initial",
      campaignRecipientKey: recipient.cycleId,
      campaignSequence: recipient.sequence,
      sentAt: new Date("2030-01-01T10:01:00.000Z"),
      sentMessageId: "message-1",
      ...scope,
    });
    expect(recipient.status).toBe("failed");
    expect(campaign.sentCount).toBe(1);

    recordMemoryCampaignDelivery([campaign], [recipient], {
      campaignId: campaign.id,
      campaignMessageType: "secondary",
      campaignRecipientKey: recipient.cycleId,
      campaignSequence: recipient.sequence,
      sentAt: new Date("2030-01-01T10:03:00.000Z"),
      sentMessageId: "message-2",
      ...scope,
    });
    expect(recipient.status).toBe("secondary_sent");
    expect(campaign.secondarySentCount).toBe(1);
    expect(campaign.failedCount).toBe(1);
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
    initialStageId: null,
    intervalMinutes: 1,
    mediaFileName: null,
    mediaStorageKey: null,
    mediaType: null,
    mediaUrl: null,
    metadata: {},
    name: "Campaign",
    repliedCount: 0,
    replyRate: 0,
    replyStageId: null,
    scheduledCount: 1,
    scheduledEndAt: now,
    scheduledStartAt: now,
    secondaryContent: "Follow up",
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

function createRecipient(
  overrides: Partial<CrmCampaignRecipient> = {},
): CrmCampaignRecipient {
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
    ...overrides,
  };
}
