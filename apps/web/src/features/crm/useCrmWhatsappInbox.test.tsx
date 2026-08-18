// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SessionBootstrap } from "../account/apiClient";
import { AccountSessionProvider } from "../account/accountSession";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import { defaultWhatsappSessionCounts } from "./crmWhatsappQueueState";
import type {
  CrmWhatsappRealtimeEvent,
  CrmWhatsappSession,
  CrmWhatsappSessionCounts,
} from "./crmWhatsappTypes";
import type * as CrmWhatsappInboxLifecycleModule from "./useCrmWhatsappInboxLifecycle";
import { useCrmWhatsappInbox } from "./useCrmWhatsappInbox";

const hookMocks = vi.hoisted(() => {
  const noop = vi.fn();
  const resolveFalse = vi.fn(async () => false);
  return {
    assignment: { assignableMembers: [], canAssignSessions: true },
    bulk: {
      actions: {},
      clearSelectedSessions: noop,
      selectedSessionIds: new Set<string>(),
      selectedSessions: [],
      selectAllVisibleSessions: noop,
      toggleSelectedSession: noop,
    },
    connections: {
      allowance: { limit: 1, remaining: 0, used: 1 },
      authorizeComposio: resolveFalse,
      availableProviders: [],
      completeComposio: resolveFalse,
      configureZapiWebhooks: resolveFalse,
      connections: [
        {
          channel: "whatsapp",
          displayName: "Loja",
          id: "connection-1",
          isDefault: true,
          live: {
            checkedAt: "2026-08-17T12:00:00.000Z",
            connected: true,
            connectedPhone: "5511999999999",
            providerStatus: "connected",
            smartphoneConnected: true,
          },
          provider: "zapi",
          readiness: { ready: true, reason: null, reasonCode: null },
          state: "active",
          status: "active",
        },
      ],
      createConnection: resolveFalse,
      disconnectZapiConnection: resolveFalse,
      error: null,
      isLoading: false,
      refreshConnections: vi.fn(async () => undefined),
      requestZapiAddon: resolveFalse,
      requestZapiPairingCode: resolveFalse,
      requestZapiPairingQr: resolveFalse,
      refreshZapiConnectionStatus: resolveFalse,
      selectComposioSender: resolveFalse,
      setConnectionPaused: resolveFalse,
      zapiAddonContract: null,
    },
    messages: {
      deleteMessage: resolveFalse,
      evictSessionMessages: vi.fn(),
      hasLoadedActiveMessages: false,
      isLoadingMessages: false,
      isSending: false,
      listCatalogProducts: vi.fn(async () => []),
      mergeRealtimeMessage: noop,
      messages: [],
      removeReaction: resolveFalse,
      sendCatalog: resolveFalse,
      sendCatalogProduct: resolveFalse,
      sendLocation: resolveFalse,
      sendMedia: resolveFalse,
      sendQuickMessage: resolveFalse,
      sendReaction: resolveFalse,
      sendText: resolveFalse,
      sendVehicle: resolveFalse,
      updateRealtimeMessageStatus: noop,
    },
    routing: {
      error: null,
      isLoading: false,
      policy: {
        channels: [
          {
            bot: {
              blocked: null,
              connection: null,
              mode: "disabled",
              ready: false,
              requiredCapabilities: [],
            },
            channel: "whatsapp",
            storeDefault: {
              blocked: null,
              connection: { id: "connection-1" },
              ready: true,
              requiredCapabilities: [],
            },
          },
        ],
        storeId: "store-1",
        tenantId: "tenant-1",
      },
      refresh: vi.fn(async () => undefined),
    },
    selectedTagIds: [] as string[],
    sessionActions: {
      actions: {
        addSessionTag: resolveFalse,
        assignSession: resolveFalse,
        closeSession: resolveFalse,
        concludeSession: resolveFalse,
        markSessionRead: resolveFalse,
        markSessionUnread: resolveFalse,
        removeSessionTag: resolveFalse,
        toggleIntervention: resolveFalse,
      },
      hasRetryableSessionAction: false,
      isConcludingSession: false,
      isMutatingSession: false,
      isSessionActionPending: vi.fn(() => false),
      retryLastSessionAction: resolveFalse,
    },
    useRealLifecycle: false,
  };
});

vi.mock("../../lib/useRemoteSearch", () => ({
  useRemoteSearch: (value: string) => value,
}));
vi.mock("./useCrmRoutingPolicy", () => ({
  useCrmRoutingPolicy: () => hookMocks.routing,
}));
vi.mock("./useCrmWhatsappAssignableMembers", () => ({
  useCrmWhatsappAssignableMembers: () => hookMocks.assignment,
}));
vi.mock("./useCrmWhatsappBulkSelection", () => ({
  useCrmWhatsappBulkSelection: () => hookMocks.bulk,
}));
vi.mock("./useCrmWhatsappConnections", () => ({
  useCrmWhatsappConnections: () => hookMocks.connections,
}));
vi.mock("./useCrmWhatsappMessages", () => ({
  useCrmWhatsappMessages: () => hookMocks.messages,
}));
vi.mock("./useCrmWhatsappInboxLifecycle", async (importOriginal) => {
  const actual = await importOriginal<typeof CrmWhatsappInboxLifecycleModule>();
  return {
    useCrmWhatsappInboxLifecycle: (
      input: Parameters<typeof actual.useCrmWhatsappInboxLifecycle>[0],
    ) =>
      hookMocks.useRealLifecycle
        ? actual.useCrmWhatsappInboxLifecycle(input)
        : undefined,
  };
});
vi.mock("./useCrmWhatsappQuickMessages", () => ({
  useCrmWhatsappQuickMessages: () => ({
    createQuickMessage: hookMocks.messages.sendText,
    deleteQuickMessage: hookMocks.messages.sendText,
    quickMessages: [],
    updateQuickMessage: hookMocks.messages.sendText,
  }),
}));
vi.mock("./useCrmWhatsappScheduledMessages", () => ({
  useCrmWhatsappScheduledMessages: () => ({
    cancelScheduledMessage: hookMocks.messages.sendText,
    createScheduledMessage: hookMocks.messages.sendText,
    error: null,
    listScheduledMessages: vi.fn(async () => []),
    processDueScheduledMessages: hookMocks.messages.sendText,
  }),
}));
vi.mock("./useCrmWhatsappSessionActions", () => ({
  useCrmWhatsappSessionActions: () => hookMocks.sessionActions,
}));
vi.mock("./useCrmWhatsappStartConversation", () => ({
  useCrmWhatsappStartConversation: () => ({
    isStartingConversation: false,
    startConversation: hookMocks.messages.sendText,
  }),
}));
vi.mock("./useCrmWhatsappTags", () => ({
  useCrmWhatsappTags: () => ({
    availableTags: [],
    createTag: hookMocks.messages.sendText,
    deleteTag: hookMocks.messages.sendText,
    refreshTags: vi.fn(async () => []),
    reorderTags: hookMocks.messages.sendText,
    selectedTagIds: hookMocks.selectedTagIds,
    toggleTagFilter: vi.fn(),
    updateTag: hookMocks.messages.sendText,
  }),
}));
vi.mock("./useCrmWhatsappVehicleInventory", () => ({
  useCrmWhatsappVehicleInventory: () => vi.fn(async () => []),
}));

describe("useCrmWhatsappInbox realtime queue integration", () => {
  afterEach(() => {
    cleanup();
    hookMocks.useRealLifecycle = false;
    window.location.hash = "";
  });

  it("loads sessions once when lifecycle and realtime updates change session state", async () => {
    hookMocks.useRealLifecycle = true;
    let onEvent: ((event: CrmWhatsappRealtimeEvent) => void) | undefined;
    const initial = createSession({ buyerName: "Inicial", revision: 1 });
    const listSessions = vi
      .fn<CrmWhatsappApi["listSessions"]>()
      .mockResolvedValueOnce([initial])
      .mockImplementation(() => new Promise(() => undefined));
    const api = {
      listSessionCounts: vi.fn(async () => defaultWhatsappSessionCounts),
      listSessions,
      subscribeEvents: vi.fn(
        (input: Parameters<CrmWhatsappApi["subscribeEvents"]>[0]) => {
          onEvent = input.onEvent;
          return vi.fn();
        },
      ),
    } as unknown as CrmWhatsappApi;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AccountSessionProvider session={createSessionBootstrap()}>
        {children}
      </AccountSessionProvider>
    );
    const { result } = renderHook(() => useCrmWhatsappInbox(api), { wrapper });

    await waitFor(() => {
      expect(result.current.sessions).toEqual([
        expect.objectContaining({ buyerName: "Inicial", revision: 1 }),
      ]);
      expect(onEvent).toBeDefined();
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(listSessions).toHaveBeenCalledTimes(1);

    act(() => {
      onEvent?.({
        connectionId: "connection-1",
        session: createSession({ buyerName: "Realtime", revision: 2 }),
        type: "session",
      });
    });

    await waitFor(() => {
      expect(result.current.sessions).toEqual([
        expect.objectContaining({ buyerName: "Realtime", revision: 2 }),
      ]);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(listSessions).toHaveBeenCalledTimes(1);
  });

  it("moves an auto-assigned session from Novos to Meus without duplication or stale overwrite", async () => {
    let onEvent: ((event: CrmWhatsappRealtimeEvent) => void) | undefined;
    let counts = createCounts({ fresh: 1, mine: 0, total: 1 });
    const initial = createSession({ assignedUserId: null, revision: 1 });
    const staleMine = createSession({
      assignedUserId: "user-current",
      buyerName: "Nome antigo",
      revision: 1,
    });
    const realtime = createSession({
      assignedUserId: "user-current",
      buyerName: "Nome atualizado",
      revision: 2,
    });
    const api = {
      listSessionCounts: vi.fn(async () => counts),
      listSessions: vi.fn(async (input: { filter: string }) =>
        input.filter === "mine" ? [staleMine] : [initial],
      ),
      subscribeEvents: vi.fn(
        (input: Parameters<CrmWhatsappApi["subscribeEvents"]>[0]) => {
          onEvent = input.onEvent;
          return vi.fn();
        },
      ),
    } as unknown as CrmWhatsappApi;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AccountSessionProvider session={createSessionBootstrap()}>
        {children}
      </AccountSessionProvider>
    );
    const { result } = renderHook(() => useCrmWhatsappInbox(api), { wrapper });

    await act(async () => result.current.refreshSessions());

    await waitFor(() => {
      expect(result.current.sessions).toHaveLength(1);
      expect(result.current.sessionCounts.filters.fresh).toBe(1);
      expect(onEvent).toBeDefined();
    });

    counts = createCounts({ fresh: 0, mine: 1, total: 1 });
    act(() => {
      onEvent?.({
        connectionId: "connection-1",
        session: realtime,
        type: "session",
      });
    });

    await waitFor(() => {
      expect(result.current.sessions).toEqual([]);
      expect(result.current.sessionCounts.filters).toMatchObject({
        fresh: 0,
        mine: 1,
      });
    });

    act(() => result.current.setQuickFilter("mine"));

    await waitFor(() => {
      expect(result.current.quickFilter).toBe("mine");
      expect(result.current.sessions).toEqual([
        expect.objectContaining({
          assignedUserId: "user-current",
          buyerName: "Nome atualizado",
          revision: 2,
        }),
      ]);
    });
    expect(
      new Set(result.current.sessions.map((session) => session.id)).size,
    ).toBe(result.current.sessions.length);
  });

  it("coerces inaccessible queue filters to Meus", async () => {
    const api = {
      listSessionCounts: vi.fn(async () => defaultWhatsappSessionCounts),
      listSessions: vi.fn(async () => []),
      subscribeEvents: vi.fn(() => vi.fn()),
    } as unknown as CrmWhatsappApi;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AccountSessionProvider session={createSessionBootstrap(false)}>
        {children}
      </AccountSessionProvider>
    );
    const { result } = renderHook(() => useCrmWhatsappInbox(api), { wrapper });

    await act(async () => result.current.refreshSessions());

    await waitFor(() => expect(api.listSessions).toHaveBeenCalled());
    expect(result.current.quickFilter).toBe("mine");
    expect(api.listSessions).toHaveBeenLastCalledWith(
      expect.objectContaining({ filter: "mine" }),
    );

    act(() => {
      result.current.setQuickFilter("others");
      result.current.setOtherAssigneeId("user-other");
    });

    expect(result.current.quickFilter).toBe("mine");
    expect(result.current.otherAssigneeId).toBeNull();
  });

  it.each([null, "user-other"])(
    "hides an active session after realtime assigns it to %s for a restricted user",
    async (assignedUserId) => {
      hookMocks.messages.evictSessionMessages.mockClear();
      let onEvent: ((event: CrmWhatsappRealtimeEvent) => void) | undefined;
      const mine = createSession({
        assignedUserId: "user-current",
        revision: 1,
      });
      const api = {
        listSessionCounts: vi.fn(async () => defaultWhatsappSessionCounts),
        listSessions: vi.fn(async () => [mine]),
        subscribeEvents: vi.fn(
          (input: Parameters<CrmWhatsappApi["subscribeEvents"]>[0]) => {
            onEvent = input.onEvent;
            return vi.fn();
          },
        ),
      } as unknown as CrmWhatsappApi;
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AccountSessionProvider session={createSessionBootstrap(false)}>
          {children}
        </AccountSessionProvider>
      );
      const { result } = renderHook(() => useCrmWhatsappInbox(api), {
        wrapper,
      });

      await act(async () => result.current.refreshSessions());
      await waitFor(() => {
        expect(result.current.activeSession?.id).toBe(mine.id);
        expect(onEvent).toBeDefined();
      });

      act(() => {
        onEvent?.({
          connectionId: "connection-1",
          session: createSession({ assignedUserId, revision: 2 }),
          type: "session",
        });
      });

      await waitFor(() => {
        expect(result.current.sessions).toEqual([]);
        expect(result.current.activeSession).toBeNull();
      });
      expect(hookMocks.messages.evictSessionMessages).toHaveBeenCalledWith(
        mine.id,
      );
    },
  );

  it("prunes an inaccessible session after a complete reconnect snapshot", async () => {
    hookMocks.messages.evictSessionMessages.mockClear();
    let onStatus:
      | ((status: "connected" | "connecting" | "degraded" | "offline") => void)
      | undefined;
    let sessions = [
      createSession({ assignedUserId: "user-current", revision: 1 }),
    ];
    const api = {
      listSessionCounts: vi.fn(async () => defaultWhatsappSessionCounts),
      listSessions: vi.fn(async () => sessions),
      subscribeEvents: vi.fn(
        (input: Parameters<CrmWhatsappApi["subscribeEvents"]>[0]) => {
          onStatus = input.onStatus;
          return vi.fn();
        },
      ),
    } as unknown as CrmWhatsappApi;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AccountSessionProvider session={createSessionBootstrap(false)}>
        {children}
      </AccountSessionProvider>
    );
    const { result } = renderHook(() => useCrmWhatsappInbox(api), { wrapper });

    await act(async () => result.current.refreshSessions());
    await waitFor(() => expect(result.current.sessions).toHaveLength(1));
    sessions = [];

    act(() => onStatus?.("connected"));

    await waitFor(() => {
      expect(result.current.sessions).toEqual([]);
      expect(result.current.activeSession).toBeNull();
    });
    expect(hookMocks.messages.evictSessionMessages).toHaveBeenCalledWith(
      "session-1",
    );
  });

  it("preserves a cached pagination miss after an incomplete reconnect snapshot", async () => {
    hookMocks.messages.evictSessionMessages.mockClear();
    let onStatus:
      | ((status: "connected" | "connecting" | "degraded" | "offline") => void)
      | undefined;
    const mine = createSession({
      assignedUserId: "user-current",
      revision: 1,
    });
    let sessions = [mine];
    const api = {
      listSessionCounts: vi.fn(async () => defaultWhatsappSessionCounts),
      listSessions: vi.fn(async () => sessions),
      subscribeEvents: vi.fn(
        (input: Parameters<CrmWhatsappApi["subscribeEvents"]>[0]) => {
          onStatus = input.onStatus;
          return vi.fn();
        },
      ),
    } as unknown as CrmWhatsappApi;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AccountSessionProvider session={createSessionBootstrap(false)}>
        {children}
      </AccountSessionProvider>
    );
    const { result } = renderHook(() => useCrmWhatsappInbox(api), { wrapper });

    await act(async () => result.current.refreshSessions());
    await waitFor(() => expect(result.current.activeSession?.id).toBe(mine.id));
    sessions = Array.from({ length: 40 }, (_, index) =>
      createSession({
        assignedUserId: "user-current",
        id: `session-page-${index}`,
        uuid: `session-page-${index}`,
      }),
    );

    act(() => onStatus?.("connected"));

    await waitFor(() => expect(result.current.sessions).toHaveLength(41));
    expect(result.current.activeSession?.id).toBe(mine.id);
    expect(hookMocks.messages.evictSessionMessages).not.toHaveBeenCalled();
  });

  it.each([
    { authorized: true, expectedSessionId: "session-deep-link" },
    { authorized: false, expectedSessionId: null },
  ])(
    "shows a deep link only when the server authorizes it ($authorized)",
    async ({ authorized, expectedSessionId }) => {
      window.location.hash = "#/crm?sessionId=session-deep-link";
      const deepLinked = createSession({
        assignedUserId: "user-current",
        revision: 1,
      });
      deepLinked.id = "session-deep-link";
      deepLinked.uuid = "session-deep-link";
      const api = {
        listSessionCounts: vi.fn(async () => defaultWhatsappSessionCounts),
        listSessions: vi.fn(async (input: { sessionId?: string | number }) =>
          input.sessionId === "session-deep-link" && authorized
            ? [deepLinked]
            : [],
        ),
        subscribeEvents: vi.fn(() => vi.fn()),
      } as unknown as CrmWhatsappApi;
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AccountSessionProvider session={createSessionBootstrap(false)}>
          {children}
        </AccountSessionProvider>
      );
      const { result } = renderHook(() => useCrmWhatsappInbox(api), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.activeSession?.id ?? null).toBe(
          expectedSessionId,
        );
      });
      expect(api.listSessions).toHaveBeenCalledWith({
        limit: 1,
        offset: 0,
        sessionId: "session-deep-link",
      });
    },
  );
});

function createSession(input: Partial<CrmWhatsappSession>): CrmWhatsappSession {
  return {
    channel: "WHATSAPP",
    connection: input.connection ?? {
      id: "connection-1",
      name: "Loja",
      provider: "zapi",
      status: "active",
    },
    id: "session-1",
    lastMessageAt: "2026-08-17T12:00:00.000Z",
    status: "ACTIVE",
    uuid: "session-1",
    ...input,
  };
}

function createCounts(input: {
  fresh: number;
  mine: number;
  total: number;
}): CrmWhatsappSessionCounts {
  return {
    ...defaultWhatsappSessionCounts,
    filters: {
      ...defaultWhatsappSessionCounts.filters,
      all: input.total,
      fresh: input.fresh,
      mine: input.mine,
    },
    total: input.total,
  };
}

function createSessionBootstrap(canAssign = true): SessionBootstrap {
  return {
    defaultStore: {
      effectivePermissions: [
        ...(canAssign ? ["crm.whatsapp.assign"] : []),
        "crm.whatsapp.list",
        "crm.whatsapp.read",
      ],
      role: "salesman",
      status: "active",
      storeId: "store-1",
      storeName: "Loja",
      storeSlug: "loja",
      tenantId: "tenant-1",
      tenantName: "Tenant",
    },
    needsOnboarding: false,
    platformAdmin: false,
    stores: [],
    tenantMemberships: [],
    user: {
      clerkUserId: "clerk-current",
      email: "current@loja.test",
      id: "user-current",
      name: "Atual",
    },
  };
}
