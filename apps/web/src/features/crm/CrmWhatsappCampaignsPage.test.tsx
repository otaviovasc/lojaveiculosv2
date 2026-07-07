// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmWhatsappCampaignsPage } from "./CrmWhatsappCampaignsPage";
import type {
  CrmWhatsappCampaign,
  CrmWhatsappCampaignDetail,
} from "./crmWhatsappCampaignTypes";
import type { CrmWhatsappSession } from "./crmWhatsappTypes";

describe("CrmWhatsappCampaignsPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("creates persistent campaigns for selected sessions", async () => {
    const user = userEvent.setup();
    const onCreateCampaign = vi.fn(async () => createCampaign());
    render(
      <CrmWhatsappCampaignsPage
        canCancel
        canCreate
        canRead
        onCancelCampaign={vi.fn(async () => createCampaign())}
        onCreateCampaign={onCreateCampaign}
        onGetCampaign={vi.fn(async () => createCampaignDetail())}
        onListCampaigns={vi.fn(async () => [])}
        onPauseCampaign={vi.fn(async () => createCampaign())}
        onResumeCampaign={vi.fn(async () => createCampaign())}
        sessions={[createSession({ buyerName: "Ana" })]}
        tags={[]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Ana/i }));
    await user.clear(screen.getByLabelText(/inicio/i));
    await user.type(screen.getByLabelText(/inicio/i), "2099-01-01T10:00");
    await user.click(screen.getByRole("button", { name: /criar campanha/i }));

    await waitFor(() =>
      expect(onCreateCampaign).toHaveBeenCalledWith({
        content: "Ola {nome}, tudo bem?",
        intervalMinutes: 2,
        name: "Nova campanha",
        recipients: [
          {
            sessionId: "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
            variables: { nome: "Ana" },
          },
        ],
        scheduledStartAt: new Date("2099-01-01T10:00").toISOString(),
      }),
    );
  });

  it("blocks campaign launch until invalid csv recipients are excluded", async () => {
    const user = userEvent.setup();
    const onCreateCampaign = vi.fn(async () => createCampaign());
    render(
      <CrmWhatsappCampaignsPage
        canCancel
        canCreate
        canRead
        onCancelCampaign={vi.fn(async () => createCampaign())}
        onCreateCampaign={onCreateCampaign}
        onGetCampaign={vi.fn(async () => createCampaignDetail())}
        onListCampaigns={vi.fn(async () => [])}
        onPauseCampaign={vi.fn(async () => createCampaign())}
        onResumeCampaign={vi.fn(async () => createCampaign())}
        sessions={[createSession({ buyerName: "Ana" })]}
        tags={[]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Ana/i }));
    await user.type(
      screen.getByPlaceholderText(/5511999999999,Ana/i),
      "5511,Fantasma",
    );
    await user.clear(screen.getByLabelText(/inicio/i));
    await user.type(screen.getByLabelText(/inicio/i), "2099-01-01T10:00");

    expect(
      screen.getByRole("button", { name: /criar campanha/i }),
    ).toBeDisabled();

    await user.click(screen.getByLabelText(/Incluir Fantasma/i));
    await user.click(screen.getByRole("button", { name: /criar campanha/i }));

    await waitFor(() => expect(onCreateCampaign).toHaveBeenCalledTimes(1));
    expect(onCreateCampaign).toHaveBeenCalledWith(
      expect.objectContaining({
        recipients: [
          {
            sessionId: "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
            variables: { nome: "Ana" },
          },
        ],
      }),
    );
  });
});

function createSession(
  overrides: Partial<CrmWhatsappSession> = {},
): CrmWhatsappSession {
  return {
    assignedUserId: null,
    buyerName: "Ana",
    buyerPhone: "5511999999999",
    channel: "WHATSAPP",
    id: "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
    lastMessageContent: "Ola",
    leadId: "0b6ec94e-3bd8-4782-a8bb-7de0f0afae6f",
    metadata: {},
    sessionTags: [],
    status: "ACTIVE",
    unreadCount: 0,
    uuid: "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
    ...overrides,
  };
}

function createCampaign(): CrmWhatsappCampaign {
  return {
    content: "Ola {nome}",
    createdAt: "2099-01-01T10:00:00.000Z",
    failedCount: 0,
    id: "c3b4e6c1-a0fb-43f4-b6dc-fc0807400c15",
    initialTagId: null,
    intervalMinutes: 2,
    name: "Nova campanha",
    repliedCount: 0,
    replyRate: 0,
    replyTagId: null,
    scheduledCount: 1,
    scheduledEndAt: "2099-01-01T10:00:00.000Z",
    scheduledStartAt: "2099-01-01T10:00:00.000Z",
    secondaryContent: null,
    secondaryDelayMinutes: 60,
    secondarySentCount: 0,
    sentCount: 0,
    status: "scheduled",
    totalRecipients: 1,
    updatedAt: "2099-01-01T10:00:00.000Z",
  };
}

function createCampaignDetail(): CrmWhatsappCampaignDetail {
  return {
    campaign: createCampaign(),
    recipients: [
      {
        campaignId: "c3b4e6c1-a0fb-43f4-b6dc-fc0807400c15",
        connectionId: "24000000-0000-4000-8000-000000000101",
        createdAt: "2099-01-01T10:00:00.000Z",
        errorMessage: null,
        id: "11b4e6c1-a0fb-43f4-b6dc-fc0807400c15",
        initialScheduledMessageId: null,
        initialSentAt: null,
        leadId: "0b6ec94e-3bd8-4782-a8bb-7de0f0afae6f",
        phone: "5511999999999",
        replyContentPreview: null,
        replyMessageId: null,
        replyReceivedAt: null,
        secondaryScheduledMessageId: null,
        secondarySentAt: null,
        sentMessageId: null,
        sequence: 0,
        sessionId: "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
        status: "pending",
        updatedAt: "2099-01-01T10:00:00.000Z",
        variables: { nome: "Ana" },
      },
    ],
  };
}
