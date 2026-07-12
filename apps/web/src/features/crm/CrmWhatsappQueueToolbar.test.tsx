// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WhatsappToolbar } from "./CrmWhatsappQueueToolbar";
import type {
  CrmWhatsappProviderConnection,
  CrmWhatsappSessionCounts,
  CrmWhatsappTag,
} from "./crmWhatsappTypes";

describe("WhatsappToolbar", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders queue metrics and applies every queue filter control", async () => {
    const user = userEvent.setup();
    const callbacks = {
      onConnectionFilterChange: vi.fn(),
      onQuickFilterChange: vi.fn(),
      onSearch: vi.fn(),
      onSelectionModeChange: vi.fn(),
      onStartConversation: vi.fn(),
      onStatusFilterChange: vi.fn(),
      onTagFilterToggle: vi.fn(),
      onUnreadOnlyChange: vi.fn(),
    };

    render(
      <WhatsappToolbar
        availableTags={createTags()}
        canManageConnections
        canManageTags
        canStartConversation
        connectionFilterId={null}
        connectionId="connection_1"
        connections={createConnections()}
        onManageConnections={vi.fn()}
        onManageTags={vi.fn()}
        quickFilter="fresh"
        search=""
        selectedTagIds={["tag_hot"]}
        selectedCount={0}
        selectionMode={false}
        sessionCount={3}
        sessionCounts={createCounts()}
        statusFilter=""
        statusLabel="ZAPI conectado"
        statusTone="online"
        unreadOnly={false}
        {...callbacks}
      />,
    );

    expect(screen.getByRole("heading", { name: "CRM" })).toBeInTheDocument();
    expect(screen.getByText("3 conversas")).toBeInTheDocument();
    expect(screen.getByText("ZAPI conectado")).toBeInTheDocument();
    expect(metric("Total")).toHaveTextContent("12");
    expect(metric("Não lidas")).toHaveTextContent("5");
    expect(
      screen
        .getByLabelText("Filtros de fila")
        .querySelectorAll(".crm-whatsapp-queue-field"),
    ).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Nova conversa" }));
    expect(callbacks.onStartConversation).toHaveBeenCalledTimes(1);

    await user.click(
      screen.getByRole("button", { name: "Selecionar conversas" }),
    );
    expect(callbacks.onSelectionModeChange).toHaveBeenCalledWith(true);

    await user.type(
      screen.getByPlaceholderText("Buscar por contato, telefone ou mensagem"),
      "j",
    );
    expect(callbacks.onSearch).toHaveBeenLastCalledWith("j");

    await user.click(screen.getByRole("button", { name: /Meus/ }));
    expect(callbacks.onQuickFilterChange).toHaveBeenCalledWith("mine");

    await user.click(screen.getByRole("button", { name: /^Não lidas/ }));
    expect(callbacks.onUnreadOnlyChange).toHaveBeenCalledWith(true);

    await user.click(screen.getByLabelText("Filtrar por status"));
    await user.click(screen.getByRole("option", { name: "Intervencao (2)" }));
    expect(callbacks.onStatusFilterChange).toHaveBeenCalledWith(
      "HUMAN_TAKEOVER",
    );

    await user.click(screen.getByLabelText("Filtrar por conexão"));
    await user.click(screen.getByRole("option", { name: "Loja Centro" }));
    expect(callbacks.onConnectionFilterChange).toHaveBeenCalledWith(
      "connection_2",
    );

    await user.click(screen.getByRole("button", { name: "Quente" }));
    expect(callbacks.onTagFilterToggle).toHaveBeenCalledWith("tag_hot");
    expect(screen.getByRole("button", { name: "Quente" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

function metric(label: string) {
  const labelElement = screen
    .getAllByText(label)
    .find((element) => element.tagName.toLowerCase() === "small");
  if (!labelElement?.parentElement) {
    throw new Error(`Metric not found: ${label}`);
  }
  return labelElement.parentElement;
}

function createCounts(): CrmWhatsappSessionCounts {
  return {
    filters: {
      all: 12,
      fresh: 3,
      mine: 2,
      others: 4,
      unassigned: 6,
    },
    statuses: {
      ACTIVE: 7,
      COMPLETED: 1,
      EXPIRED: 1,
      HUMAN_TAKEOVER: 2,
      MINIBOT_ACTIVE: 1,
    },
    total: 12,
    unread: 5,
  };
}

function createConnections(): CrmWhatsappProviderConnection[] {
  return [
    createConnection("connection_1", "Loja Matriz"),
    createConnection("connection_2", "Loja Centro"),
  ];
}

function createConnection(
  id: string,
  displayName: string,
): CrmWhatsappProviderConnection {
  return {
    displayName,
    externalConnectionId: id,
    externalInstanceId: `instance_${id}`,
    id,
    live: {
      checkedAt: "2026-07-03T12:00:00.000Z",
      connected: true,
      connectedPhone: "5511999999999",
      providerStatus: "connected",
      smartphoneConnected: true,
    },
    phone: "5511999999999",
    provider: "zapi",
    status: "active",
    webhookUrl: null,
  };
}

function createTags(): CrmWhatsappTag[] {
  return [
    { color: "var(--color-danger)", id: "tag_hot", name: "Quente" },
    {
      color: "var(--color-accent)",
      id: "tag_financing",
      name: "Financiamento",
    },
  ];
}
