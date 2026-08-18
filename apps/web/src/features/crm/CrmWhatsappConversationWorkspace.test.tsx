// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState, type ComponentProps, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CrmWhatsappConversationWorkspace } from "./CrmWhatsappConversationWorkspace";
import type { ChatHeader, MessageComposer } from "./CrmWhatsappParts";
import type { useCrmWhatsappInbox } from "./useCrmWhatsappInbox";

vi.mock("./CrmWhatsappParts", () => ({
  ChatHeader: ({ onClose }: ComponentProps<typeof ChatHeader>) => (
    <button onClick={onClose} type="button">
      Concluir
    </button>
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
vi.mock("./CrmWhatsappMessageParts", () => ({
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
vi.mock("./CrmWhatsappQueueToolbar", () => ({
  WhatsappToolbar: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));
vi.mock("./CrmWhatsappSessionList", () => ({ SessionList: () => null }));
vi.mock("./CrmWhatsappBulkBar", () => ({ WhatsappBulkBar: () => null }));
vi.mock("./CrmWhatsappReadOnlyComposer", () => ({
  CrmWhatsappReadOnlyComposer: () => null,
}));
vi.mock("./CrmWhatsappNewConversationDialog", () => ({
  CrmWhatsappNewConversationDialog: () => null,
}));
vi.mock("./CrmWhatsappSessionDetailsPanel", () => ({
  CrmWhatsappSessionDetailsPanel: () => null,
}));

describe("CrmWhatsappConversationWorkspace conclusion", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "command-workspace") });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("opens the conclusion workflow instead of closing the session directly", async () => {
    const user = userEvent.setup();
    const concludeSession = vi.fn(async () => true);
    const closeSession = vi.fn(async () => true);
    render(
      <CrmWhatsappConversationWorkspace
        inbox={createInbox({ closeSession, concludeSession })}
        onScopeChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Concluir" }));
    expect(await screen.findByRole("dialog")).toBeVisible();
    expect(closeSession).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", { name: "Concluir atendimento" }),
    );
    expect(concludeSession).toHaveBeenCalledWith("session-1", {
      commandId: "command-workspace",
      outcome: "follow_up",
    });
  });

  it("remounts the composer when the view connection changes", async () => {
    const user = userEvent.setup();
    const connection = createConnection("connection-1");
    const baseInbox = createInbox({
      closeSession: vi.fn(async () => true),
      concludeSession: vi.fn(async () => true),
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
    } as unknown as ReturnType<typeof useCrmWhatsappInbox>;
    const rendered = render(
      <CrmWhatsappConversationWorkspace
        inbox={firstInbox}
        onScopeChange={vi.fn()}
      />,
    );

    await user.type(screen.getByRole("textbox", { name: "Rascunho" }), "oi");
    await user.click(screen.getByRole("button", { name: "Abrir reações" }));
    expect(screen.getByRole("textbox", { name: "Rascunho" })).toHaveValue("oi");
    expect(screen.getByRole("menu")).toHaveTextContent("Reações");

    rendered.rerender(
      <CrmWhatsappConversationWorkspace
        inbox={{
          ...firstInbox,
          connectionFilterId: "connection-2",
        }}
        onScopeChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("textbox", { name: "Rascunho" })).toHaveValue("");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(firstInbox.activeSessionConnection?.id).toBe("connection-1");
    expect(firstInbox.activeSession?.connection?.id).toBe("connection-1");
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
  closeSession,
  concludeSession,
}: {
  closeSession: ReturnType<typeof vi.fn>;
  concludeSession: ReturnType<typeof vi.fn>;
}) {
  return {
    actions: {
      addSessionTag: vi.fn(async () => false),
      assignSession: vi.fn(async () => false),
      bulkApplySessions: vi.fn(async () => false),
      closeSession,
      concludeSession,
      markSessionRead: vi.fn(async () => false),
      markSessionUnread: vi.fn(async () => false),
      removeSessionTag: vi.fn(async () => false),
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
      buyerName: "Ana",
      channel: "WHATSAPP",
      id: "session-1",
      leadId: "lead-1",
      status: "ACTIVE",
      uuid: "session-1",
    },
    activeSessionId: "session-1",
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
    selectedSessionIds: new Set(),
    selectedSessions: [],
    selectedTagIds: [],
    sessionCounts: null,
    sessions: [],
    setActiveSessionId: vi.fn(),
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
  } as unknown as ReturnType<typeof useCrmWhatsappInbox>;
}
