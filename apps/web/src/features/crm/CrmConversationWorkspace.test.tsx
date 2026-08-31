// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CrmConversationWorkspace } from "./CrmConversationWorkspace";
import type { ChatHeader, MessageComposer } from "./CrmConversationParts";
import type { CrmConversationCycleDetailsPanel } from "./CrmConversationCycleDetailsPanel";
import type { useCrmInbox } from "./useCrmInbox";

vi.mock("./CrmConversationParts", () => ({
  ChatHeader: ({
    actionsDisabled,
    contactPresence,
    onBack,
    onClose,
    onOpenDetails,
  }: ComponentProps<typeof ChatHeader>) => (
    <>
      {contactPresence ? <output>{contactPresence}</output> : null}
      <input aria-label="Buscar mensagens" />
      <input aria-label="Prompt IA" />
      <button onClick={onBack} type="button">
        Voltar para conversas
      </button>
      <button disabled={actionsDisabled} onClick={onClose} type="button">
        Concluir
      </button>
      <button onClick={onOpenDetails} type="button">
        Abrir detalhes
      </button>
    </>
  ),
  MessageComposer: forwardRef(function MockMessageComposer(
    { disabled, onSend }: ComponentProps<typeof MessageComposer>,
    ref,
  ) {
    const [draft, setDraft] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => ({
      focusInput: () => inputRef.current?.focus({ preventScroll: true }),
      insertPrompt: (text: string) => setDraft(text),
      openFiles: () => undefined,
    }));
    return (
      <div>
        <input
          aria-label="Rascunho"
          disabled={disabled}
          onChange={(event) => setDraft(event.target.value)}
          ref={inputRef}
          value={draft}
        />
        <button onClick={() => void onSend(draft)} type="button">
          Enviar rascunho
        </button>
      </div>
    );
  }),
}));
vi.mock("./CrmMessageParts", () => ({
  MessageList: ({ actionsDisabled }: { actionsDisabled?: boolean }) => {
    const [reactionOpen, setReactionOpen] = useState(false);
    return (
      <div>
        <button disabled={actionsDisabled} type="button">
          Ação da mensagem
        </button>
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
  CrmReadOnlyComposer: ({
    actionLabel,
    onAction,
    reason,
    title,
  }: {
    actionLabel?: string;
    onAction?: () => void;
    reason?: string;
    title?: string;
  }) => (
    <div role="note">
      <strong>{title}</strong>
      <span>{reason}</span>
      {onAction ? (
        <button onClick={onAction} type="button">
          {actionLabel}
        </button>
      ) : null}
    </div>
  ),
}));
vi.mock("./CrmNewConversationDialog", () => ({
  CrmNewConversationDialog: () => null,
}));
vi.mock("./CrmConversationCycleDetailsPanel", () => ({
  CrmConversationCycleDetailsPanel: ({
    isOpen,
  }: ComponentProps<typeof CrmConversationCycleDetailsPanel>) =>
    isOpen ? <div data-testid="details-panel" /> : null,
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

  it("keeps details open when Escape belongs to a viewport dialog", async () => {
    const user = userEvent.setup();
    render(
      <CrmConversationWorkspace
        inbox={createInbox({
          closeCycle: vi.fn(async () => true),
          concludeCycle: vi.fn(async () => true),
        })}
        onCycleChange={vi.fn()}
        onScopeChange={vi.fn()}
        routeCycleId="cycle-1"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Abrir detalhes" }));
    expect(screen.getByTestId("details-panel")).toBeInTheDocument();

    const dialog = document.createElement("div");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("role", "dialog");
    document.body.append(dialog);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByTestId("details-panel")).toBeInTheDocument();

    dialog.remove();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("details-panel")).not.toBeInTheDocument();
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

    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Rascunho" })).toHaveFocus(),
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

  it("keeps the mobile pane shortcuts available after focus leaves the workspace", async () => {
    const connection = createConnection("connection-1");
    const inbox = {
      ...createInbox({
        closeCycle: vi.fn(async () => true),
        concludeCycle: vi.fn(async () => true),
      }),
      activeSessionConnection: connection,
      canSendText: true,
      connections: [connection],
    } as unknown as ReturnType<typeof useCrmInbox>;
    render(
      <CrmConversationWorkspace
        inbox={inbox}
        onCycleChange={vi.fn()}
        onScopeChange={vi.fn()}
        routeCycleId="cycle-1"
      />,
    );
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Rascunho" })).toHaveFocus(),
    );

    const outsideButton = document.createElement("button");
    document.body.append(outsideButton);
    outsideButton.focus();
    fireEvent.keyDown(window, { altKey: true, key: "1" });
    await actAnimationFrame();
    expect(
      screen.getByRole("complementary", { name: "Fila de conversas" }),
    ).toHaveFocus();

    fireEvent.keyDown(window, { altKey: true, key: "2" });
    await actAnimationFrame();
    expect(screen.getByRole("textbox", { name: "Rascunho" })).toHaveFocus();
    outsideButton.remove();
  });

  it("passes verified active-contact presence to the conversation header", () => {
    render(
      <CrmConversationWorkspace
        inbox={
          {
            ...createInbox({
              closeCycle: vi.fn(async () => true),
              concludeCycle: vi.fn(async () => true),
            }),
            activeContactPresence: "typing",
          } as unknown as ReturnType<typeof useCrmInbox>
        }
        onCycleChange={vi.fn()}
        onScopeChange={vi.fn()}
        routeCycleId="cycle-1"
      />,
    );

    expect(screen.getByText("typing")).toBeInTheDocument();
  });

  it("keeps header search and Prompt IA focused across conversation updates", async () => {
    const connection = createConnection("connection-1");
    const baseInbox = createInbox({
      closeCycle: vi.fn(async () => true),
      concludeCycle: vi.fn(async () => true),
    });
    const editableInbox = {
      ...baseInbox,
      activeSessionConnection: connection,
      canSendText: true,
      connections: [connection],
    } as unknown as ReturnType<typeof useCrmInbox>;
    const rendered = render(
      <CrmConversationWorkspace
        inbox={editableInbox}
        onCycleChange={vi.fn()}
        onScopeChange={vi.fn()}
        routeCycleId="cycle-1"
      />,
    );
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Rascunho" })).toHaveFocus(),
    );

    const search = screen.getByRole("textbox", { name: "Buscar mensagens" });
    search.focus();
    rendered.rerender(
      <CrmConversationWorkspace
        inbox={{
          ...editableInbox,
          activeSession: { ...editableInbox.activeSession!, id: "cycle-2" },
        }}
        onCycleChange={vi.fn()}
        onScopeChange={vi.fn()}
        routeCycleId="cycle-2"
      />,
    );
    await actAnimationFrame();
    expect(search).toHaveFocus();

    const prompt = screen.getByRole("textbox", { name: "Prompt IA" });
    prompt.focus();
    rendered.rerender(
      <CrmConversationWorkspace
        inbox={{
          ...editableInbox,
          activeSession: { ...editableInbox.activeSession!, id: "cycle-3" },
        }}
        onCycleChange={vi.fn()}
        onScopeChange={vi.fn()}
        routeCycleId="cycle-3"
      />,
    );
    await actAnimationFrame();
    expect(prompt).toHaveFocus();
  });

  it("keeps text editing available while pending text blocks destructive actions", () => {
    const connection = createConnection("connection-1");
    const baseInbox = createInbox({
      closeCycle: vi.fn(async () => true),
      concludeCycle: vi.fn(async () => true),
    });
    render(
      <CrmConversationWorkspace
        inbox={
          {
            ...baseInbox,
            activeSessionConnection: connection,
            canSendText: true,
            connections: [connection],
            hasPendingTextMessages: true,
            isBlockingMutation: true,
            isSending: false,
          } as unknown as ReturnType<typeof useCrmInbox>
        }
        onCycleChange={vi.fn()}
        onScopeChange={vi.fn()}
        routeCycleId="cycle-1"
      />,
    );

    expect(screen.getByRole("textbox", { name: "Rascunho" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Concluir" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Ação da mensagem" }),
    ).toBeDisabled();
  });

  it("keeps demo history visible and routes setup from the read-only composer", async () => {
    const user = userEvent.setup();
    const onScopeChange = vi.fn();
    const demoConnection = {
      ...createConnection("ui-demo"),
      purpose: "ui_demo" as const,
      readiness: {
        ready: false,
        reason: "Demonstração somente leitura",
        reasonCode: "not_authorized" as const,
      },
      state: "sandbox" as const,
      status: "sandbox" as const,
    };
    const inbox = createInbox({
      closeCycle: vi.fn(async () => true),
      concludeCycle: vi.fn(async () => true),
    });

    render(
      <CrmConversationWorkspace
        inbox={
          {
            ...inbox,
            activeConnection: demoConnection,
            activeSession: {
              ...inbox.activeSession,
              connection: demoConnection,
            },
            activeSessionConnection: demoConnection,
            connections: [demoConnection],
            permissions: {
              ...inbox.permissions,
              canConnectionSetup: true,
              canSend: true,
            },
            sendUnavailableReason:
              "Esta conexão de demonstração é somente leitura.",
          } as unknown as ReturnType<typeof useCrmInbox>
        }
        onCycleChange={vi.fn()}
        onScopeChange={onScopeChange}
        routeCycleId="cycle-1"
      />,
    );

    expect(screen.getByRole("note")).toHaveTextContent(
      "Demonstração · somente leitura",
    );
    expect(screen.getByRole("note")).toHaveTextContent(
      "Histórico fictício para explorar o CRM",
    );
    await user.click(screen.getByRole("button", { name: "Configurar canal" }));
    expect(onScopeChange).toHaveBeenCalledWith("connection");
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

async function actAnimationFrame() {
  await new Promise<void>((resolve) =>
    window.requestAnimationFrame(() => resolve()),
  );
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
    hasPendingTextMessages: false,
    isBlockingMutation: false,
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
