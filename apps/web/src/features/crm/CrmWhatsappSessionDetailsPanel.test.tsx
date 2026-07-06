// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmWhatsappSessionDetailsPanel } from "./CrmWhatsappSessionDetailsPanel";
import type { CrmWhatsappSession } from "./crmWhatsappTypes";

describe("CrmWhatsappSessionDetailsPanel", () => {
  afterEach(cleanup);

  it("shows session context and links to the CRM lead", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <CrmWhatsappSessionDetailsPanel
        assignableMembers={[
          {
            email: "ana@loja.test",
            id: 12,
            isActive: true,
            name: "Ana",
            role: "MEMBER",
            seeUnassignedChats: true,
          },
        ]}
        onClose={onClose}
        session={session()}
      />,
    );

    expect(screen.getByText("Maria Cliente")).toBeVisible();
    expect(screen.getByText("Ana")).toBeVisible();
    expect(
      screen.getByRole("link", { name: /Lead vinculado/ }),
    ).toHaveAttribute("href", "#/crm?surface=leads&leadId=lead_1");
    await user.click(screen.getByRole("button", { name: "Fechar detalhes" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

function session(): CrmWhatsappSession {
  return {
    assignedUserId: "12",
    buyerName: "Maria Cliente",
    buyerPhone: "5511999999999",
    channel: "WHATSAPP",
    id: "session_1",
    lastMessageAt: "2026-07-03T12:00:00.000Z",
    leadId: "lead_1",
    sessionTags: [{ id: "tag_1", name: "Quente" }],
    status: "ACTIVE",
    uuid: "session_1",
  };
}
