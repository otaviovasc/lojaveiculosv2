// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SessionBootstrap } from "../account/apiClient";
import { AccountSessionProvider } from "../account/accountSession";
import type { CrmConversationApi } from "./crmConversationApi";
import type { CrmScheduledMessage } from "./crmConversationExtraTypes";
import { CrmLeadScheduledMessagesPanel } from "./CrmLeadScheduledMessagesPanel";

function createSession(permissions: string[]): SessionBootstrap {
  return {
    defaultStore: {
      effectivePermissions: permissions,
      role: "owner",
      status: "active",
      storeId: "store_1",
      storeName: "Loja Teste",
      storeSlug: "loja-teste",
      tenantId: "tenant_1",
      tenantName: "Tenant Teste",
    },
    needsOnboarding: false,
    platformAdmin: false,
    stores: [],
    tenantMemberships: [],
    user: {
      clerkUserId: "user_1",
      email: "test@example.com",
      id: "user_1",
      name: "Usuario Teste",
    },
  };
}

function renderWithSession(
  ui: ReactNode,
  permissions: string[] = [
    "crm.scheduled_messages.read",
    "crm.scheduled_messages.cancel",
  ],
) {
  const session = createSession(permissions);
  return render(
    <AccountSessionProvider session={session}>{ui}</AccountSessionProvider>,
  );
}

describe("CrmLeadScheduledMessagesPanel", () => {
  afterEach(cleanup);

  it("does not render when user lacks schedule read permission", () => {
    const mockApi: Partial<CrmConversationApi> = {
      listScheduledMessages: vi.fn().mockResolvedValue([]),
    };

    renderWithSession(
      <CrmLeadScheduledMessagesPanel
        api={mockApi as CrmConversationApi}
        leadId="lead-1"
      />,
      [], // no permissions
    );

    expect(screen.queryByText(/Mensagens agendadas/)).not.toBeInTheDocument();
    expect(mockApi.listScheduledMessages).not.toHaveBeenCalled();
  });

  it("renders empty state when there are no scheduled messages", async () => {
    const mockApi: Partial<CrmConversationApi> = {
      listScheduledMessages: vi.fn().mockResolvedValue([]),
    };

    renderWithSession(
      <CrmLeadScheduledMessagesPanel
        api={mockApi as CrmConversationApi}
        leadId="lead-1"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Mensagens agendadas (0)")).toBeInTheDocument();
      expect(
        screen.getByText("Nenhuma mensagem agendada para este cliente."),
      ).toBeInTheDocument();
    });
  });

  it("renders scheduled messages with preview, datetime, and Portuguese status labels", async () => {
    const messages: CrmScheduledMessage[] = [
      {
        id: "msg-1",
        content: "Olá! Confirmando visita de amanhã.",
        scheduledAt: "2026-09-10T14:30:00Z",
        status: "pending",
        cancelledAt: null,
        connectionId: "conn-1",
        createdAt: "2026-09-09T10:00:00Z",
        createdByUserId: "user-1",
        errorMessage: null,
        metadata: {},
        recipientAddress: "5511999998888",
        sentAt: null,
        sentMessageId: null,
        cycleId: "cycle-1",
        updatedAt: "2026-09-09T10:00:00Z",
      },
      {
        id: "msg-2",
        content: "Proposta enviada por e-mail.",
        scheduledAt: "2026-09-08T10:00:00Z",
        status: "sent",
        cancelledAt: null,
        connectionId: "conn-1",
        createdAt: "2026-09-08T09:00:00Z",
        createdByUserId: "user-1",
        errorMessage: null,
        metadata: {},
        recipientAddress: "5511999998888",
        sentAt: "2026-09-08T10:00:05Z",
        sentMessageId: "sent-1",
        cycleId: "cycle-1",
        updatedAt: "2026-09-08T10:00:05Z",
      },
      {
        id: "msg-3",
        content: "Tentativa com erro.",
        scheduledAt: "2026-09-07T10:00:00Z",
        status: "failed",
        cancelledAt: null,
        connectionId: "conn-1",
        createdAt: "2026-09-07T09:00:00Z",
        createdByUserId: "user-1",
        errorMessage: "Número inválido",
        metadata: {},
        recipientAddress: "5511999998888",
        sentAt: null,
        sentMessageId: null,
        cycleId: "cycle-1",
        updatedAt: "2026-09-07T10:00:00Z",
      },
    ];

    const mockApi: Partial<CrmConversationApi> = {
      listScheduledMessages: vi.fn().mockResolvedValue(messages),
    };

    renderWithSession(
      <CrmLeadScheduledMessagesPanel
        api={mockApi as CrmConversationApi}
        leadId="lead-1"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Mensagens agendadas (3)")).toBeInTheDocument();
      expect(
        screen.getByText("Olá! Confirmando visita de amanhã."),
      ).toBeInTheDocument();
      expect(screen.getByText("Pendente")).toBeInTheDocument();
      expect(screen.getByText("Enviada")).toBeInTheDocument();
      expect(screen.getByText("Falhou")).toBeInTheDocument();
      expect(screen.getByText("Número inválido")).toBeInTheDocument();
    });
  });

  it("shows cap notice when 100 or more items are returned", async () => {
    const messages: CrmScheduledMessage[] = Array.from(
      { length: 100 },
      (_, i) => ({
        id: `msg-${i}`,
        content: `Mensagem ${i}`,
        scheduledAt: "2026-09-10T14:30:00Z",
        status: "pending" as const,
        cancelledAt: null,
        connectionId: "conn-1",
        createdAt: "2026-09-09T10:00:00Z",
        createdByUserId: "user-1",
        errorMessage: null,
        metadata: {},
        recipientAddress: "5511999998888",
        sentAt: null,
        sentMessageId: null,
        cycleId: "cycle-1",
        updatedAt: "2026-09-09T10:00:00Z",
      }),
    );

    const mockApi: Partial<CrmConversationApi> = {
      listScheduledMessages: vi.fn().mockResolvedValue(messages),
    };

    renderWithSession(
      <CrmLeadScheduledMessagesPanel
        api={mockApi as CrmConversationApi}
        leadId="lead-1"
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Exibindo até 100 mensagens agendadas deste cliente."),
      ).toBeInTheDocument();
    });
  });

  it("allows cancelling a pending message and shows busy state", async () => {
    const pendingMsg: CrmScheduledMessage = {
      id: "msg-pending",
      content: "Mensagem para cancelar",
      scheduledAt: "2026-09-10T14:30:00Z",
      status: "pending",
      cancelledAt: null,
      connectionId: "conn-1",
      createdAt: "2026-09-09T10:00:00Z",
      createdByUserId: "user-1",
      errorMessage: null,
      metadata: {},
      recipientAddress: "5511999998888",
      sentAt: null,
      sentMessageId: null,
      cycleId: "cycle-1",
      updatedAt: "2026-09-09T10:00:00Z",
    };

    let resolveCancel: (value: CrmScheduledMessage) => void;
    const cancelPromise = new Promise<CrmScheduledMessage>((resolve) => {
      resolveCancel = resolve;
    });

    const mockApi: Partial<CrmConversationApi> = {
      listScheduledMessages: vi.fn().mockResolvedValue([pendingMsg]),
      cancelScheduledMessage: vi.fn().mockReturnValue(cancelPromise),
    };

    renderWithSession(
      <CrmLeadScheduledMessagesPanel
        api={mockApi as CrmConversationApi}
        leadId="lead-1"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Cancelar")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Cancelar"));

    // Busy state
    expect(screen.getByText("Cancelando...")).toBeInTheDocument();

    // Resolve cancellation
    resolveCancel!({
      ...pendingMsg,
      status: "cancelled",
      cancelledAt: "2026-09-09T10:30:00Z",
    });

    await waitFor(() => {
      expect(screen.getByText("Cancelada")).toBeInTheDocument();
      expect(screen.queryByText("Cancelar")).not.toBeInTheDocument();
    });
  });

  it("handles error and allows retry", async () => {
    let callCount = 0;
    const mockApi: Partial<CrmConversationApi> = {
      listScheduledMessages: vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error("Erro ao consultar servidor"));
        }
        return Promise.resolve([]);
      }),
    };

    renderWithSession(
      <CrmLeadScheduledMessagesPanel
        api={mockApi as CrmConversationApi}
        leadId="lead-1"
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByText("Erro ao consultar servidor"),
      ).toBeInTheDocument();
      expect(screen.getByText("Tentar novamente")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Tentar novamente"));

    await waitFor(() => {
      expect(
        screen.getByText("Nenhuma mensagem agendada para este cliente."),
      ).toBeInTheDocument();
    });
  });
});
