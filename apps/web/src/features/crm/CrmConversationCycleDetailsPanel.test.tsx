// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmConversationCycleDetailsPanel } from "./CrmConversationCycleDetailsPanel";
import type { CrmConversationCycle, CrmMessage } from "./crmConversationTypes";

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

  it("opens details media in the viewport gallery and restores thumbnail focus", async () => {
    const user = userEvent.setup();
    render(
      <CrmConversationCycleDetailsPanel
        assignableMembers={[]}
        messages={[
          message({
            content: "Foto frontal",
            id: "image-1",
            mediaUrl: "https://cdn.example.test/front.jpg",
            type: "IMAGE",
          }),
          message({
            content: "[video]",
            id: "video-1",
            mediaUrl: "https://cdn.example.test/walkaround.mp4",
            type: "VIDEO",
          }),
          message({
            content: "Proposta",
            id: "document-1",
            mediaUrl: "https://cdn.example.test/proposta.pdf",
            metadata: { media: { fileName: "proposta.pdf" } },
            type: "DOCUMENT",
          }),
        ]}
        onClose={vi.fn()}
        cycle={cycle()}
      />,
    );

    const secondThumbnail = screen.getByRole("button", {
      name: "Abrir mídia 2",
    });
    await user.click(secondThumbnail);

    const dialog = screen.getByRole("dialog", {
      name: "Visualizador de midia",
    });
    expect(
      screen.getByRole("complementary", { name: "Detalhes da conversa" }),
    ).not.toContainElement(dialog);
    expect(screen.getByLabelText("Video da conversa")).toHaveAttribute(
      "src",
      "https://cdn.example.test/walkaround.mp4",
    );
    expect(screen.getByText("2 / 2")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Midia anterior" }));
    expect(within(dialog).getByAltText("Foto frontal")).toHaveAttribute(
      "src",
      "https://cdn.example.test/front.jpg",
    );
    expect(screen.getByText("Contato")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Ampliar imagem" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Baixar midia" })).toHaveAttribute(
      "href",
      "https://cdn.example.test/front.jpg",
    );

    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    expect(secondThumbnail).toHaveFocus();

    await user.click(
      screen.getByRole("button", { name: "Ver documentos: 1 itens" }),
    );
    expect(screen.getByRole("link", { name: /proposta.pdf/ })).toHaveAttribute(
      "href",
      "https://cdn.example.test/proposta.pdf",
    );
  });
});

function message(overrides: Partial<CrmMessage>): CrmMessage {
  return {
    content: "Mensagem",
    createdAt: "2026-07-03T12:00:00.000Z",
    direction: "INBOUND",
    id: "message-1",
    senderType: "CUSTOMER",
    status: "DELIVERED",
    type: "TEXT",
    ...overrides,
  };
}

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
