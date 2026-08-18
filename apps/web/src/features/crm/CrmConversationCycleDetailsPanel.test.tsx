// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmConversationCycleDetailsPanel } from "./CrmConversationCycleDetailsPanel";
import type { CrmConversationCycle } from "./crmConversationTypes";

describe("CrmConversationCycleDetailsPanel", () => {
  afterEach(cleanup);

  it("shows cycle context and links to the CRM lead", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <CrmConversationCycleDetailsPanel
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
        cycle={cycle()}
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
      <CrmConversationCycleDetailsPanel
        assignableMembers={[]}
        onClose={vi.fn()}
        cycle={{
          ...cycle(),
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
      <CrmConversationCycleDetailsPanel
        assignableMembers={[]}
        onClose={vi.fn()}
        cycle={{
          ...cycle(),
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
      <CrmConversationCycleDetailsPanel
        assignableMembers={[]}
        onClose={vi.fn()}
        cycle={{
          ...cycle(),
          connection: {
            id: "connection_meta",
            displayName: "Número oficial",
            provider: "meta_cloud",
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

function cycle(): CrmConversationCycle {
  return {
    assignedUserId: "12",
    customerDisplayName: "Maria Cliente",
    customerPhone: "5511999999999",
    channel: "whatsapp",
    connection: {
      id: "connection_1",
      displayName: "WhatsApp showroom",
      provider: "zapi",
      status: "active",
    },
    id: "session_1",
    lastMessageAt: "2026-07-03T12:00:00.000Z",
    leadId: "lead_1",
    metadata: { broker: "direct" },
    tags: [{ id: "tag_1", name: "Quente" }],
    status: "ACTIVE",
    vehicle: { title: "Honda Civic Touring 2024" },
  };
}
