// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ComponentProps, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CrmConversationWorkspace } from "./CrmConversationWorkspace";
import type { ChatHeader, MessageComposer } from "./CrmConversationParts";
import type { useCrmInbox } from "./useCrmInbox";

vi.mock("./CrmConversationParts", () => ({
  ChatHeader: ({ onBack, onClose }: ComponentProps<typeof ChatHeader>) => (
    <>
      <button onClick={onBack} type="button">
        Voltar para conversas
      </button>
      <button onClick={onClose} type="button">
        Concluir
      </button>
    </>
  ),
  MessageComposer: ({ onSend }: ComponentProps<typeof MessageComposer>) => {
    const [draft, setDraft] = useState("");
    return (
      <div>
        <input
          aria-label="Rascunho"
          onChange={(event) => setDraft(event.target.value)}
          value={draft}
        />
        <button onClick={() => void onSend(draft)} type="button">
          Enviar rascunho
        </button>
      </div>
    );
  },
}));
vi.mock("./CrmMessageParts", () => ({
  MessageList: () => {
    const [reactionOpen, setReactionOpen] = useState(false);
    return (
      <div>
        <button onClick={() => setReactionOpen(true)} type="button">
          Abrir reações
        </button>
        {reactionOpen ? <div role="menu">Reações</div> : null}
      </div>
    );
  },
}));
vi.mock("./CrmQueueToolbar", () => ({
  CrmQueueToolbar: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));
vi.mock("./CrmConversationCycleList", () => ({
  SessionList: ({ onSelect }: { onSelect: (cycleId: string) => void }) => (
    <button onClick={() => onSelect("cycle-2")} type="button">
      Abrir segunda conversa
    </button>
  ),
}));
vi.mock("./CrmQueueBulkBar", () => ({ CrmQueueBulkBar: () => null }));
vi.mock("./CrmReadOnlyComposer", () => ({
  CrmReadOnlyComposer: () => null,
}));
vi.mock("./CrmNewConversationDialog", () => ({
  CrmNewConversationDialog: () => null,
}));
vi.mock("./CrmConversationCycleDetailsPanel", () => ({
  CrmConversationCycleDetailsPanel: () => null,
}));

describe("CrmConversationWorkspace conclusion", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "command-workspace") });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("opens the conclusion workflow instead of closing the cycle directly", async () => {
    const user = userEvent.setup();
    const concludeCycle = vi.fn(async () => true);
    const closeCycle = vi.fn(async () => true);
    render(
      <CrmConversationWorkspace
        inbox={createInbox({ closeCycle, concludeCycle })}
        onCycleChange={vi.fn()}
        onScopeChange={vi.fn()}
        routeCycleId="cycle-1"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Concluir" }));
    expect(await screen.findByRole("dialog")).toBeVisible();
    expect(closeCycle).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", { name: "Concluir atendimento" }),
    );
    expect(concludeCycle).toHaveBeenCalledWith("cycle-1", {
      commandId: "command-workspace",
      outcome: "follow_up",
    });
  });

  it("remounts the composer when the view connection changes", async () => {
    const user = userEvent.setup();
    const connection = createConnection("connection-1");
    const baseInbox = createInbox({
      closeCycle: vi.fn(async () => true),
      concludeCycle: vi.fn(async () => true),
    });
    const firstInbox = {
      ...baseInbox,
      activeSession: {
        ...baseInbox.activeSession,
        connection: {
          id: connection.id,
          name: connection.displayName,
          provider: connection.provider,
          status: connection.status,
        },
      },
      activeSessionConnection: connection,
      canSendText: true,
      connectionFilterId: null,
      connections: [connection, createConnection("connection-2")],
    } as unknown as ReturnType<typeof useCrmInbox>;
    const rendered = render(
      <CrmConversationWorkspace
        inbox={firstInbox}
        onCycleChange={vi.fn()}
        onScopeChange={vi.fn()}
        routeCycleId="cycle-1"
      />,
    );

    await user.type(screen.getByRole("textbox", { name: "Rascunho" }), "oi");
    await user.click(screen.getByRole("button", { name: "Abrir reações" }));
    expect(screen.getByRole("textbox", { name: "Rascunho" })).toHaveValue("oi");
    expect(screen.getByRole("menu")).toHaveTextContent("Reações");

    rendered.rerender(
      <CrmConversationWorkspace
        inbox={{
          ...firstInbox,
          connectionFilterId: "connection-2",
        }}
        onCycleChange={vi.fn()}
        onScopeChange={vi.fn()}
        routeCycleId="cycle-1"
      />,
    );

    expect(screen.getByRole("textbox", { name: "Rascunho" })).toHaveValue("");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(firstInbox.activeSessionConnection?.id).toBe("connection-1");
    expect(firstInbox.activeSession?.connection?.id).toBe("connection-1");
  });

  it("delegates conversation selection and mobile back to route state", async () => {
    const user = userEvent.setup();
    const onCycleChange = vi.fn();
    render(
      <CrmConversationWorkspace
        inbox={createInbox({
          closeCycle: vi.fn(async () => true),
          concludeCycle: vi.fn(async () => true),
        })}
        onCycleChange={onCycleChange}
        onScopeChange={vi.fn()}
        routeCycleId="cycle-1"
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Abrir segunda conversa" }),
    );
    expect(onCycleChange).toHaveBeenLastCalledWith("cycle-2");

    await user.click(
      screen.getByRole("button", { name: "Voltar para conversas" }),
    );
    expect(onCycleChange).toHaveBeenLastCalledWith(null);
  });
});

function createConnection(id: string) {
  return {
    channel: "whatsapp" as const,
    displayName: id,
    externalConnectionId: id,
    externalInstanceId: `instance-${id}`,
    id,
    isDefault: id === "connection-1",
    live: {
      checkedAt: "2026-08-17T12:00:00.000Z",
      connected: true,
      connectedPhone: "5511999999999",
      providerStatus: "connected",
      smartphoneConnected: true,
    },
    phone: "5511999999999",
    provider: "zapi" as const,
    readiness: { ready: true, reason: null, reasonCode: null },
    state: "active" as const,
    status: "active" as const,
    webhookUrl: null,
  };
}

function createInbox({
  closeCycle,
  concludeCycle,
}: {
  closeCycle: ReturnType<typeof vi.fn>;
  concludeCycle: ReturnType<typeof vi.fn>;
}) {
  return {
    actions: {
      addCycleTag: vi.fn(async () => false),
      assignCycle: vi.fn(async () => false),
      bulkApplySessions: vi.fn(async () => false),
      closeCycle,
      concludeCycle,
      markCycleRead: vi.fn(async () => false),
      markCycleUnread: vi.fn(async () => false),
      removeCycleTag: vi.fn(async () => false),
      toggleIntervention: vi.fn(async () => false),
    },
    activeSession: {
      assignedMember: {
        email: null,
        id: 7,
        name: "Carlos",
        role: "MEMBER",
      },
      assignedUserId: "7",
      customerDisplayName: "Ana",
      channel: "whatsapp",
      id: "cycle-1",
      leadId: "lead-1",
      status: "ACTIVE",
    },
    activeCycleId: "cycle-1",
    assignableMembers: [],
    availableTags: [],
    canAssignSessions: true,
    canSendText: false,
    canStartConversation: false,
    clearSelectedSessions: vi.fn(),
    connectionFilterId: "all",
    connections: [],
    currentUserId: "7",
    humanAttendanceFilter: "all",
    isConcludingSession: false,
    isLoading: false,
    isLoadingMessages: false,
    isMutatingSession: false,
    isSessionActionPending: () => false,
    isSending: false,
    messages: [],
    otherAssigneeId: "all",
    permissions: {
      canAssign: true,
      canClose: true,
      canConnectionPair: false,
      canConnectionSetup: false,
      canRead: true,
      canScheduleCreate: false,
      canScheduleRead: false,
      canSend: false,
      canTagAssign: false,
      canTagManage: false,
      canToggleIntervention: false,
    },
    quickFilter: "all",
    search: "",
    selectedCycleIds: new Set(),
    selectedSessions: [],
    selectedTagIds: [],
    conversationCycleCounts: null,
    conversationCycles: [],
    setActiveCycleId: vi.fn(),
    setConnectionFilterId: vi.fn(),
    setHumanAttendanceFilter: vi.fn(),
    setOtherAssigneeId: vi.fn(),
    setQuickFilter: vi.fn(),
    setSearch: vi.fn(),
    setStatusFilter: vi.fn(),
    setUnreadOnly: vi.fn(),
    statusFilter: "ACTIVE",
    toggleSelectedSession: vi.fn(),
    toggleTagFilter: vi.fn(),
    unreadOnly: false,
  } as unknown as ReturnType<typeof useCrmInbox>;
}
