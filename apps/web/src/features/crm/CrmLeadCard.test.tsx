// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmLeadCard } from "./CrmLeadCard";
import type { ProductCrmLead } from "./productCrmTypes";

describe("CrmLeadCard", () => {
  afterEach(cleanup);

  const baseLead: ProductCrmLead = {
    assignedUserId: null,
    buyerEmail: "carlos@example.com",
    buyerName: "Carlos Silva",
    buyerPhone: "+55 (11) 98765-4321",
    createdAt: "2026-09-08T10:00:00.000Z",
    id: "lead_123",
    lastInteractionAt: "2026-09-08T12:00:00.000Z",
    listingId: null,
    metadata: {},
    pipelineId: "sales",
    pipelineStageId: "new",
    source: "whatsapp",
    status: "new",
    storeId: "store_1",
    tenantId: "tenant_1",
    updatedAt: "2026-09-08T12:00:00.000Z",
    vehicleTitle: null,
  };

  it("renders lead name and basic information", () => {
    render(
      <CrmLeadCard
        lead={baseLead}
        onChatClick={vi.fn()}
        onDragStart={vi.fn()}
        onSelectLead={vi.fn()}
        vehicleOptions={[]}
      />,
    );

    expect(screen.getByText("CARLOS SILVA")).toBeInTheDocument();
    expect(screen.getByText("CS")).toBeInTheDocument();
  });

  it("renders direct WhatsApp Web shortcut and opens link", () => {
    const windowOpenSpy = vi
      .spyOn(window, "open")
      .mockImplementation(() => null);

    render(
      <CrmLeadCard
        lead={baseLead}
        onChatClick={vi.fn()}
        onDragStart={vi.fn()}
        onSelectLead={vi.fn()}
        vehicleOptions={[]}
      />,
    );

    const waBtn = screen.getByTitle("Conversar no WhatsApp Web");
    expect(waBtn).toBeInTheDocument();
    fireEvent.click(waBtn);

    expect(windowOpenSpy).toHaveBeenCalledWith(
      "https://wa.me/5511987654321",
      "_blank",
      "noopener,noreferrer",
    );

    windowOpenSpy.mockRestore();
  });

  it("calls onChatClick when CRM chat button is clicked", () => {
    const onChatClick = vi.fn();
    render(
      <CrmLeadCard
        lead={baseLead}
        onChatClick={onChatClick}
        onDragStart={vi.fn()}
        onSelectLead={vi.fn()}
        vehicleOptions={[]}
      />,
    );

    const chatBtn = screen.getByTitle("Abrir chat no CRM");
    fireEvent.click(chatBtn);

    expect(onChatClick).toHaveBeenCalledWith(baseLead);
  });

  it("renders unread pulsing badge when lead is unread", () => {
    const unreadLead = {
      ...baseLead,
      metadata: { unread: true },
    };

    render(
      <CrmLeadCard
        lead={unreadLead}
        onChatClick={vi.fn()}
        onDragStart={vi.fn()}
        onSelectLead={vi.fn()}
        vehicleOptions={[]}
      />,
    );

    expect(screen.getByTitle("Nova interação não lida")).toBeInTheDocument();
  });

  it("renders financing approved badge with bank and amount", () => {
    const financingLead: ProductCrmLead = {
      ...baseLead,
      metadata: {
        status_financiamento: {
          status: "APROVADO",
          banco: "Santander",
          valorAprovado: 50000,
        },
      },
    };

    render(
      <CrmLeadCard
        lead={financingLead}
        onChatClick={vi.fn()}
        onDragStart={vi.fn()}
        onSelectLead={vi.fn()}
        vehicleOptions={[]}
      />,
    );

    expect(screen.getByText(/Financ\. Aprovado/)).toBeInTheDocument();
    expect(screen.getByText(/Santander/)).toBeInTheDocument();
    expect(screen.getByText(/50\.000/)).toBeInTheDocument();
  });

  it("renders scheduled visit badge", () => {
    const visitLead: ProductCrmLead = {
      ...baseLead,
      metadata: {
        visita_agendada: {
          datetime: "2026-09-12T15:00:00.000Z",
          veiculoLabel: "Corolla 2023",
        },
      },
    };

    render(
      <CrmLeadCard
        lead={visitLead}
        onChatClick={vi.fn()}
        onDragStart={vi.fn()}
        onSelectLead={vi.fn()}
        vehicleOptions={[]}
      />,
    );

    expect(screen.getByText(/Visita:/)).toBeInTheDocument();
    expect(screen.getByText("Corolla 2023")).toBeInTheDocument();
  });

  it("renders temperature tag and custom CRM tags", () => {
    const taggedLead: ProductCrmLead = {
      ...baseLead,
      metadata: {
        tag: "LEAD_QUENTE",
        tags_crm: [{ id: "1", name: "Troca", emoji: "🚗" }],
      },
    };

    render(
      <CrmLeadCard
        lead={taggedLead}
        onChatClick={vi.fn()}
        onDragStart={vi.fn()}
        onSelectLead={vi.fn()}
        vehicleOptions={[]}
      />,
    );

    expect(screen.getByText("Quente")).toBeInTheDocument();
    expect(screen.getByText("Troca")).toBeInTheDocument();
    expect(screen.getByText("🚗")).toBeInTheDocument();
  });

  it("opens quick schedule popover and triggers onQuickScheduleTask", async () => {
    const onQuickScheduleTask = vi.fn(async () => undefined);

    render(
      <CrmLeadCard
        lead={baseLead}
        onChatClick={vi.fn()}
        onDragStart={vi.fn()}
        onQuickScheduleTask={onQuickScheduleTask}
        onSelectLead={vi.fn()}
        vehicleOptions={[]}
      />,
    );

    const scheduleBtn = screen.getByTitle("Agendamento rápido");
    fireEvent.click(scheduleBtn);

    expect(screen.getByText("Agendar retorno")).toBeInTheDocument();
    const amanhaBtn = screen.getByText("Amanhã (10h)");
    fireEvent.click(amanhaBtn);

    expect(onQuickScheduleTask).toHaveBeenCalledWith(
      "lead_123",
      expect.stringContaining("T10:00:00"),
      "Retornar contato",
    );
  });
});
