// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WhatsappToolbar } from "./CrmWhatsappQueueToolbar";
import { formatWhatsappMemberRole } from "./CrmWhatsappQueueToolbarParts";
import type {
  CrmWhatsappAssignableMember,
  CrmWhatsappProviderConnection,
  CrmWhatsappSessionCounts,
  CrmWhatsappTag,
} from "./crmWhatsappTypes";

describe("WhatsappToolbar", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the Repasses filter hierarchy and applies queue filters", async () => {
    const user = userEvent.setup();
    const callbacks = {
      onConnectionFilterChange: vi.fn(),
      onHumanAttendanceFilterChange: vi.fn(),
      onOtherAssigneeChange: vi.fn(),
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
        canAssign
        canManageConnections
        canManageTags
        canStartConversation
        connectionFilterId={null}
        connectionId="connection_1"
        connections={createConnections()}
        onManageConnections={vi.fn()}
        onManageTags={vi.fn()}
        assignableMembers={createAssignableMembers()}
        currentUserId="user_current"
        humanAttendanceFilter=""
        otherAssigneeId={null}
        quickFilter="fresh"
        search=""
        selectedTagIds={["tag_hot"]}
        selectedCount={0}
        selectionMode={false}
        sessionCount={3}
        sessionCounts={createCounts()}
        statusFilter=""
        unreadOnly={false}
        {...callbacks}
      />,
    );

    expect(screen.getByRole("heading", { name: "CRM" })).toBeInTheDocument();
    expect(screen.getByText("3 conversas")).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Filtros inteligentes" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Filtros rápidos" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Filtrar por status"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Todos os status")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Nova conversa" }));
    expect(callbacks.onStartConversation).toHaveBeenCalledTimes(1);

    await user.click(
      screen.getByRole("button", { name: "Selecionar conversas" }),
    );
    expect(callbacks.onSelectionModeChange).toHaveBeenCalledWith(true);

    await user.type(
      screen.getByPlaceholderText("Pesquisar por nome ou telefone..."),
      "j",
    );
    expect(callbacks.onSearch).toHaveBeenLastCalledWith("j");

    await user.click(screen.getByRole("button", { name: /Meus/ }));
    expect(callbacks.onQuickFilterChange).toHaveBeenCalledWith("mine");

    await user.click(screen.getByRole("button", { name: /^Não lidas/ }));
    expect(callbacks.onUnreadOnlyChange).toHaveBeenCalledWith(true);

    await user.click(screen.getByRole("button", { name: /Concluídos/ }));
    expect(callbacks.onStatusFilterChange).toHaveBeenCalledWith("COMPLETED");

    await user.click(screen.getByRole("button", { name: /Aguardando Humano/ }));
    expect(callbacks.onHumanAttendanceFilterChange).toHaveBeenCalledWith(
      "WAITING_HUMAN",
    );
    await user.click(
      screen.getByRole("button", { name: /Em atendimento Humano/ }),
    );
    expect(callbacks.onHumanAttendanceFilterChange).toHaveBeenCalledWith(
      "IN_HUMAN_SERVICE",
    );

    await user.click(screen.getByLabelText("Filtrar por conexão"));
    expect(screen.queryByText("Loja Offline")).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("option", { name: /WhatsApp.*Z-API.*Loja Centro/ }),
    );
    expect(callbacks.onConnectionFilterChange).toHaveBeenCalledWith(
      "connection_2",
    );

    const tagsTrigger = screen.getByRole("button", { name: /Etiquetas/ });
    await user.click(tagsTrigger);
    const tagsMenu = screen.getByRole("menu", {
      name: "Filtrar por etiquetas",
    });
    expect(tagsTrigger).toHaveAttribute("aria-controls", tagsMenu.id);
    expect(
      within(tagsMenu).getByRole("group", { name: "Etiquetas disponíveis" }),
    ).toBeInTheDocument();
    const hotTag = within(tagsMenu).getByRole("menuitemcheckbox", {
      name: "Quente",
    });
    expect(hotTag).toHaveFocus();
    await user.click(hotTag);
    expect(callbacks.onTagFilterToggle).toHaveBeenCalledWith("tag_hot");
    expect(hotTag).toHaveAttribute("aria-checked", "true");
    await user.keyboard("{ArrowDown}");
    expect(
      within(tagsMenu).getByRole("menuitemcheckbox", {
        name: "Financiamento",
      }),
    ).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(
      screen.queryByRole("menu", { name: "Filtrar por etiquetas" }),
    ).toBeNull();
    expect(tagsTrigger).toHaveFocus();

    const othersTrigger = screen.getByRole("button", { name: /Outros/ });
    await user.click(othersTrigger);
    const assignees = screen.getByRole("listbox", {
      name: "Atendentes da loja",
    });
    expect(othersTrigger).toHaveAttribute("aria-controls", assignees.id);
    expect(
      within(assignees).getByRole("option", { name: /Todos os atendentes/ }),
    ).toHaveFocus();
    const bruno = within(assignees).getByRole("option", {
      name: /Bruno.*Vendedor.*4/,
    });
    expect(bruno).toBeInTheDocument();
    await user.keyboard("{ArrowDown}{Enter}");
    expect(callbacks.onQuickFilterChange).toHaveBeenCalledWith("others");
    expect(callbacks.onOtherAssigneeChange).toHaveBeenCalledWith("user_bruno");
    expect(
      screen.queryByRole("listbox", { name: "Atendentes da loja" }),
    ).toBeNull();
    expect(othersTrigger).toHaveFocus();
  });

  it("uses dealership role labels in the assignee hierarchy", () => {
    expect(formatWhatsappMemberRole("owner")).toBe("Dono");
    expect(formatWhatsappMemberRole("salesman")).toBe("Vendedor");
    expect(formatWhatsappMemberRole("supervisor")).toBe("Supervisor");
  });

  it("offers only Meus to actors without assignment visibility", () => {
    render(
      <WhatsappToolbar
        assignableMembers={createAssignableMembers()}
        availableTags={[]}
        canAssign={false}
        canManageConnections={false}
        canManageTags={false}
        canStartConversation={false}
        connectionFilterId={null}
        connectionId="connection_1"
        connections={createConnections()}
        currentUserId="user_current"
        humanAttendanceFilter=""
        onConnectionFilterChange={vi.fn()}
        onHumanAttendanceFilterChange={vi.fn()}
        onManageConnections={vi.fn()}
        onManageTags={vi.fn()}
        onOtherAssigneeChange={vi.fn()}
        onQuickFilterChange={vi.fn()}
        onSearch={vi.fn()}
        onSelectionModeChange={vi.fn()}
        onStartConversation={vi.fn()}
        onStatusFilterChange={vi.fn()}
        onTagFilterToggle={vi.fn()}
        onUnreadOnlyChange={vi.fn()}
        otherAssigneeId={null}
        quickFilter="mine"
        search=""
        selectedCount={0}
        selectedTagIds={[]}
        selectionMode={false}
        sessionCount={2}
        sessionCounts={createCounts()}
        statusFilter=""
        unreadOnly={false}
      />,
    );

    const quickFilters = screen.getByRole("group", {
      name: "Filtros rápidos",
    });
    expect(quickFilters).toHaveTextContent("Meus");
    expect(quickFilters).not.toHaveTextContent("Novos");
    expect(quickFilters).not.toHaveTextContent("Sem atendente");
    expect(quickFilters).not.toHaveTextContent("Outros");
    expect(quickFilters).not.toHaveTextContent("Todos");
  });
});

function createCounts(): CrmWhatsappSessionCounts {
  return {
    assignees: [
      { assigneeId: "user_current", count: 2 },
      { assigneeId: "user_bruno", count: 4 },
    ],
    filters: {
      all: 12,
      fresh: 3,
      mine: 2,
      others: 4,
      unassigned: 6,
    },
    inHumanService: 3,
    statuses: {
      ACTIVE: 7,
      COMPLETED: 1,
      EXPIRED: 1,
      HUMAN_TAKEOVER: 2,
      MINIBOT_ACTIVE: 1,
    },
    total: 12,
    unread: 5,
    waitingHuman: 2,
  };
}

function createConnections(): CrmWhatsappProviderConnection[] {
  return [
    createConnection("connection_1", "Loja Matriz"),
    createConnection("connection_2", "Loja Centro"),
    {
      ...createConnection("connection_offline", "Loja Offline"),
      live: {
        ...createConnection("connection_offline", "Loja Offline").live,
        connected: false,
        providerStatus: "disconnected",
        smartphoneConnected: false,
      },
      status: "disconnected",
    },
  ];
}

function createConnection(
  id: string,
  displayName: string,
): CrmWhatsappProviderConnection {
  return {
    channel: "whatsapp",
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
    readiness: {
      ready: id !== "connection_offline",
      reasonCode: id === "connection_offline" ? "provider_disconnected" : null,
      reason: id === "connection_offline" ? "Provider disconnected" : null,
    },
    status: "active",
    state: "active",
    isDefault: id === "connection_1",
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

function createAssignableMembers(): CrmWhatsappAssignableMember[] {
  return [
    {
      email: "atual@loja.local",
      id: "user_current" as never,
      isActive: true,
      name: "Atual",
      role: "OWNER",
      seeUnassignedChats: true,
    },
    {
      email: "bruno@loja.local",
      id: "user_bruno" as never,
      isActive: true,
      name: "Bruno",
      role: "MEMBER",
      seeUnassignedChats: true,
    },
  ];
}
