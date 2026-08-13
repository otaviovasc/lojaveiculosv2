// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CrmWhatsappConversationWorkspace } from "./CrmWhatsappConversationWorkspace";
import type { ChatHeader } from "./CrmWhatsappParts";
import type { useCrmWhatsappInbox } from "./useCrmWhatsappInbox";

vi.mock("./CrmWhatsappParts", () => ({
  ChatHeader: ({ onClose }: ComponentProps<typeof ChatHeader>) => (
    <button onClick={onClose} type="button">
      Concluir
    </button>
  ),
  MessageComposer: () => null,
}));
vi.mock("./CrmWhatsappMessageParts", () => ({ MessageList: () => null }));
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
});

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
