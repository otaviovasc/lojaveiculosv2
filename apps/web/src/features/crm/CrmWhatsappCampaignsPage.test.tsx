// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmWhatsappCampaignsPage } from "./CrmWhatsappCampaignsPage";
import type { CrmWhatsappSession } from "./crmWhatsappTypes";

describe("CrmWhatsappCampaignsPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("creates scheduled sends for selected sessions", async () => {
    const user = userEvent.setup();
    const onSchedule = vi.fn(async () => true);
    render(
      <CrmWhatsappCampaignsPage
        canCancel
        canCreate
        canRead
        connectionId="24000000-0000-4000-8000-000000000101"
        onCancel={vi.fn(async () => true)}
        onList={vi.fn(async () => [])}
        onSchedule={onSchedule}
        sessions={[createSession({ buyerName: "Ana" })]}
        tags={[]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Ana/i }));
    await user.clear(screen.getByLabelText(/inicio/i));
    await user.type(screen.getByLabelText(/inicio/i), "2099-01-01T10:00");
    await user.click(screen.getByRole("button", { name: /criar campanha/i }));

    await waitFor(() =>
      expect(onSchedule).toHaveBeenCalledWith({
        scheduledAt: new Date("2099-01-01T10:00").toISOString(),
        sessionId: "4e0b8d0a-7a93-4a5f-8d26-89a35f8e5d61",
        text: "Ola Ana, tudo bem?",
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
