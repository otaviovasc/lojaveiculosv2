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
      screen.getByRole("heading", { name: "Rota da conversa" }),
    ).toBeVisible();
    expect(screen.getByText("WhatsApp")).toBeVisible();
    expect(screen.getByText("Z-API")).toBeVisible();
    expect(screen.getByText("Direto")).toBeVisible();
    expect(screen.getByText("WhatsApp showroom")).toBeVisible();
    expect(
      screen.getByRole("link", { name: /Lead vinculado/ }),
    ).toHaveAttribute("href", "#/crm?surface=leads&leadId=lead_1");
    expect(screen.queryByText("lead_1")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Fechar detalhes" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows the originating ad context when attribution is available", () => {
    render(
      <CrmWhatsappSessionDetailsPanel
        assignableMembers={[]}
        onClose={vi.fn()}
        session={{
          ...session(),
          metadata: {
            adBody: "Civic Touring com baixa quilometragem",
            adSourceApp: "facebook",
            adSourceUrl: "https://facebook.example.test/ads/civic-123",
            adThumbnailUrl: "https://cdn.example.test/civic-123.jpg",
            adTitle: "Civic Touring 2024",
            isAdInitiated: true,
          },
        }}
      />,
    );

    expect(screen.getByText("Origem do anuncio")).toBeVisible();
    expect(screen.getByText("Civic Touring 2024")).toBeVisible();
    expect(
      screen.getByText("Civic Touring com baixa quilometragem"),
    ).toBeVisible();
    expect(
      screen.getByRole("img", { name: "Civic Touring 2024" }),
    ).toHaveAttribute("src", "https://cdn.example.test/civic-123.jpg");
    expect(screen.getByRole("link", { name: "Abrir anuncio" })).toHaveAttribute(
      "href",
      "https://facebook.example.test/ads/civic-123",
    );
  });

  it("shows the precise attendance state in the details panel", () => {
    render(
      <CrmWhatsappSessionDetailsPanel
        assignableMembers={[]}
        onClose={vi.fn()}
        session={{
          ...session(),
          humanAttendanceState: "WAITING_HUMAN",
          status: "HUMAN_TAKEOVER",
        }}
      />,
    );

    expect(screen.getByText("Aguardando Humano")).toBeVisible();
    expect(screen.queryByText("Atendimento humano")).not.toBeInTheDocument();
  });

  it("keeps channel, transport and credential broker as separate facts", () => {
    render(
      <CrmWhatsappSessionDetailsPanel
        assignableMembers={[]}
        onClose={vi.fn()}
        session={{
          ...session(),
          connection: {
            id: "connection_meta",
            name: "Número oficial",
            provider: "composio_whatsapp",
            status: "active",
          },
          metadata: { broker: "composio" },
        }}
      />,
    );

    expect(screen.getByText("WhatsApp")).toBeVisible();
    expect(screen.getByText("Meta Cloud")).toBeVisible();
    expect(screen.getByText("Composio")).toBeVisible();
    expect(screen.getByText("Número oficial")).toBeVisible();
  });
});

function session(): CrmWhatsappSession {
  return {
    assignedUserId: "12",
    buyerName: "Maria Cliente",
    buyerPhone: "5511999999999",
    channel: "WHATSAPP",
    connection: {
      id: "connection_1",
      name: "WhatsApp showroom",
      provider: "zapi",
      status: "active",
    },
    id: "session_1",
    lastMessageAt: "2026-07-03T12:00:00.000Z",
    leadId: "lead_1",
    metadata: { broker: "direct" },
    sessionTags: [{ id: "tag_1", name: "Quente" }],
    status: "ACTIVE",
    uuid: "session_1",
    vehicle: { title: "Honda Civic Touring 2024" },
  };
}
