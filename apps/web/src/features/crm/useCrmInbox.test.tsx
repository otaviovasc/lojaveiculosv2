// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SessionBootstrap } from "../account/apiClient";
import { AccountSessionProvider } from "../account/accountSession";
import { persistCurrentStoreSlug } from "../account/currentStore";
import type { CrmConversationApi } from "./crmConversationApi";
import { defaultConversationCycleCounts } from "./crmQueueState";
import type {
  CrmRealtimeEvent,
  CrmConversationCycle,
  CrmConversationCycleCounts,
} from "./crmConversationTypes";
import type * as CrmInboxLifecycleModule from "./useCrmInboxLifecycle";
import { useCrmInbox } from "./useCrmInbox";

const hookMocks = vi.hoisted(() => {
  const noop = vi.fn();
  const resolveFalse = vi.fn(async () => false);
  return {
    assignment: { assignableMembers: [], canAssignSessions: true },
    bulk: {
      actions: {},
      clearSelectedSessions: noop,
      selectedCycleIds: new Set<string>(),
      selectedSessions: [],
      selectAllVisibleSessions: noop,
      toggleSelectedSession: noop,
    },
    connections: {
      allowance: { limit: 1, remaining: 0, used: 1 },
      authorizeComposio: resolveFalse,
      availableSetups: [],
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
      clearError: vi.fn(),
      error: null as Error | null,
      isLoading: false,
      refreshConnections: vi.fn(async () => undefined),
      repairZapiConnectionCredentials: resolveFalse,
      requestZapiPairingCode: resolveFalse,
      requestZapiPairingQr: resolveFalse,
      refreshZapiConnectionStatus: resolveFalse,
      selectComposioSender: resolveFalse,
      setConnectionPaused: resolveFalse,
    },
    messages: {
      deleteMessage: resolveFalse,
      evictAllSessionMessages: vi.fn(),
      evictSessionMessages: vi.fn(),
      hasPendingTextMessages: false,
      hasLoadedActiveMessages: false,
      isBlockingMutation: false,
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
      clearError: vi.fn(),
      error: null as Error | null,
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
        addCycleTag: resolveFalse,
        assignCycle: resolveFalse,
        closeCycle: resolveFalse,
        concludeCycle: resolveFalse,
        markCycleRead: resolveFalse,
        markCycleUnread: resolveFalse,
        removeCycleTag: resolveFalse,
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
vi.mock("./useCrmAssignableMembers", () => ({
  useCrmAssignableMembers: () => hookMocks.assignment,
}));
vi.mock("./useCrmBulkSelection", () => ({
  useCrmBulkSelection: () => hookMocks.bulk,
}));
vi.mock("./useCrmConnections", () => ({
  useCrmConnections: () => hookMocks.connections,
}));
vi.mock("./useCrmMessages", () => ({
  useCrmMessages: () => hookMocks.messages,
}));
vi.mock("./useCrmInboxLifecycle", async (importOriginal) => {
  const actual = await importOriginal<typeof CrmInboxLifecycleModule>();
  return {
    useCrmInboxLifecycle: (
      input: Parameters<typeof actual.useCrmInboxLifecycle>[0],
    ) =>
      hookMocks.useRealLifecycle
        ? actual.useCrmInboxLifecycle(input)
        : undefined,
  };
});
vi.mock("./useCrmQuickMessages", () => ({
  useCrmQuickMessages: () => ({
    createQuickMessage: hookMocks.messages.sendText,
    deleteQuickMessage: hookMocks.messages.sendText,
    quickMessages: [],
    updateQuickMessage: hookMocks.messages.sendText,
  }),
}));
vi.mock("./useCrmScheduledMessages", () => ({
  useCrmScheduledMessages: () => ({
    cancelScheduledMessage: hookMocks.messages.sendText,
    createScheduledMessage: hookMocks.messages.sendText,
    error: null,
    listScheduledMessages: vi.fn(async () => []),
    processDueScheduledMessages: hookMocks.messages.sendText,
  }),
}));
vi.mock("./useCrmConversationCycleActions", () => ({
  useCrmConversationCycleActions: () => hookMocks.sessionActions,
}));
vi.mock("./useCrmStartConversation", () => ({
  useCrmStartConversation: () => ({
    isStartingConversation: false,
    startConversation: hookMocks.messages.sendText,
  }),
}));
vi.mock("./useCrmTags", () => ({
  useCrmTags: () => ({
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
vi.mock("./useCrmVehicleInventory", () => ({
  useCrmVehicleInventory: () => vi.fn(async () => []),
}));

describe("useCrmInbox realtime queue integration", () => {
  afterEach(() => {
    cleanup();
    hookMocks.useRealLifecycle = false;
    hookMocks.connections.connections = [createConnection()];
    hookMocks.connections.error = null;
    hookMocks.connections.clearError.mockClear();
    hookMocks.routing.error = null;
    hookMocks.routing.clearError.mockClear();
    localStorage.clear();
    window.location.hash = "";
  });

  it("uses the agency-selected store for permissions and storefront context", () => {
    const session = createSessionBootstrap();
    session.defaultStore = null;
    session.stores = [
      {
        effectivePermissions: [
          "crm.conversations.assign",
          "crm.conversations.read",
          "crm.messages.send",
        ],
        role: "agency",
        status: "active",
        storeId: "store-agency",
        storeName: "Loja da agência",
        storeSlug: "agency-store",
        tenantId: "tenant-agency",
        tenantName: "Agência",
      },
    ];
    persistCurrentStoreSlug("agency-store", session.user.clerkUserId);
    const api = {
      listConversationCycleCounts: vi.fn(
        async () => defaultConversationCycleCounts,
      ),
      subscribeEvents: vi.fn(() => vi.fn()),
    } as unknown as CrmConversationApi;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AccountSessionProvider session={session}>
        {children}
      </AccountSessionProvider>
    );

    const { result } = renderHook(() => useCrmInbox(api), { wrapper });

    expect(result.current.catalogUrl).toBe(
      `${window.location.origin}/agency-store`,
    );
    expect(result.current.storeLocationName).toBe("Loja da agência");
    expect(result.current.permissions).toMatchObject({
      canAssign: true,
      canList: true,
      canRead: true,
      canSend: true,
    });
  });

  it("loads conversationCycles once when lifecycle and realtime updates change cycle state", async () => {
    hookMocks.useRealLifecycle = true;
    let onEvent: ((event: CrmRealtimeEvent) => void) | undefined;
    const initial = createSession({
      customerDisplayName: "Inicial",
      revision: 1,
    });
    const listConversationCycles = vi
      .fn<CrmConversationApi["listConversationCycles"]>()
      .mockResolvedValueOnce([initial])
      .mockImplementation(() => new Promise(() => undefined));
    const api = {
      listConversationCycleCounts: vi.fn(
        async () => defaultConversationCycleCounts,
      ),
      listConversationCycles,
      subscribeEvents: vi.fn(
        (input: Parameters<CrmConversationApi["subscribeEvents"]>[0]) => {
          onEvent = input.onEvent;
          return vi.fn();
        },
      ),
    } as unknown as CrmConversationApi;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AccountSessionProvider session={createSessionBootstrap()}>
        {children}
      </AccountSessionProvider>
    );
    const { result } = renderHook(() => useCrmInbox(api), { wrapper });

    await waitFor(() => {
      expect(result.current.conversationCycles).toEqual([
        expect.objectContaining({
          customerDisplayName: "Inicial",
          revision: 1,
        }),
      ]);
      expect(onEvent).toBeDefined();
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(listConversationCycles).toHaveBeenCalledTimes(1);

    act(() => {
      onEvent?.({
        connectionId: "connection-1",
        cycle: createSession({ customerDisplayName: "Realtime", revision: 2 }),
        type: "cycle",
      });
    });

    await waitFor(() => {
      expect(result.current.conversationCycles).toEqual([
        expect.objectContaining({
          customerDisplayName: "Realtime",
          revision: 2,
        }),
      ]);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(listConversationCycles).toHaveBeenCalledTimes(1);
  });

  it("moves an auto-assigned cycle from Novos to Meus without duplication or stale overwrite", async () => {
    let onEvent: ((event: CrmRealtimeEvent) => void) | undefined;
    let counts = createCounts({ fresh: 1, mine: 0, total: 1 });
    const initial = createSession({ assignedUserId: null, revision: 1 });
    const staleMine = createSession({
      assignedUserId: "user-current",
      customerDisplayName: "Nome antigo",
      revision: 1,
    });
    const realtime = createSession({
      assignedUserId: "user-current",
      customerDisplayName: "Nome atualizado",
      revision: 2,
    });
    const api = {
      listConversationCycleCounts: vi.fn(async () => counts),
      listConversationCycles: vi.fn(async (input: { filter: string }) =>
        input.filter === "mine" ? [staleMine] : [initial],
      ),
      subscribeEvents: vi.fn(
        (input: Parameters<CrmConversationApi["subscribeEvents"]>[0]) => {
          onEvent = input.onEvent;
          return vi.fn();
        },
      ),
    } as unknown as CrmConversationApi;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AccountSessionProvider session={createSessionBootstrap()}>
        {children}
      </AccountSessionProvider>
    );
    const { result } = renderHook(() => useCrmInbox(api), { wrapper });

    await act(async () => result.current.refreshSessions());

    await waitFor(() => {
      expect(result.current.conversationCycles).toHaveLength(1);
      expect(result.current.conversationCycleCounts.filters.fresh).toBe(1);
      expect(onEvent).toBeDefined();
    });

    counts = createCounts({ fresh: 0, mine: 1, total: 1 });
    act(() => {
      onEvent?.({
        connectionId: "connection-1",
        cycle: realtime,
        type: "cycle",
      });
    });

    await waitFor(() => {
      expect(result.current.conversationCycles).toEqual([]);
      expect(result.current.conversationCycleCounts.filters).toMatchObject({
        fresh: 0,
        mine: 1,
      });
    });

    act(() => result.current.setQuickFilter("mine"));

    await waitFor(() => {
      expect(result.current.quickFilter).toBe("mine");
      expect(result.current.conversationCycles).toEqual([
        expect.objectContaining({
          assignedUserId: "user-current",
          customerDisplayName: "Nome atualizado",
          revision: 2,
        }),
      ]);
    });
    expect(
      new Set(result.current.conversationCycles.map((cycle) => cycle.id)).size,
    ).toBe(result.current.conversationCycles.length);
  });

  it("preserves the active conversation when a queue filter hides it", async () => {
    hookMocks.messages.evictSessionMessages.mockClear();
    const active = createSession({
      assignedUserId: "user-current",
      revision: 1,
    });
    const api = {
      listConversationCycleCounts: vi.fn(
        async () => defaultConversationCycleCounts,
      ),
      listConversationCycles: vi.fn(async () => [active]),
      subscribeEvents: vi.fn(() => vi.fn()),
    } as unknown as CrmConversationApi;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AccountSessionProvider session={createSessionBootstrap()}>
        {children}
      </AccountSessionProvider>
    );
    const { result } = renderHook(() => useCrmInbox(api), { wrapper });

    await act(async () => result.current.refreshSessions());
    await waitFor(() =>
      expect(result.current.activeSession?.id).toBe(active.id),
    );

    act(() => result.current.setQuickFilter("fresh"));

    expect(result.current.conversationCycles).toEqual([]);
    expect(result.current.activeCycleId).toBe(active.id);
    expect(result.current.activeSession?.id).toBe(active.id);
    expect(hookMocks.messages.evictSessionMessages).not.toHaveBeenCalledWith(
      active.id,
    );
  });

  it("stops exposing the active conversation when read permission is revoked", async () => {
    const active = createSession({ assignedUserId: "user-current" });
    const api = {
      listConversationCycleCounts: vi.fn(
        async () => defaultConversationCycleCounts,
      ),
      listConversationCycles: vi.fn(async () => [active]),
      subscribeEvents: vi.fn(() => vi.fn()),
    } as unknown as CrmConversationApi;
    let session = createSessionBootstrap();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AccountSessionProvider session={session}>
        {children}
      </AccountSessionProvider>
    );
    const { result, rerender } = renderHook(
      ({ revision }: { revision: number }) => {
        void revision;
        return useCrmInbox(api);
      },
      { initialProps: { revision: 0 }, wrapper },
    );

    await act(async () => result.current.refreshSessions());
    await waitFor(() => expect(result.current.activeSession).toEqual(active));

    session = {
      ...session,
      defaultStore: session.defaultStore
        ? { ...session.defaultStore, effectivePermissions: [] }
        : null,
    };
    rerender({ revision: 1 });

    expect(result.current.activeSession).toBeNull();
    expect(result.current.activeCycleId).toBeNull();
    expect(result.current.conversationCycles).toEqual([]);
    expect(result.current.messages).toEqual([]);
  });

  it("clears only the transient error identified by errorId", async () => {
    const transient = new Error("falha temporária");
    const listConversationCycleCounts = vi
      .fn<CrmConversationApi["listConversationCycleCounts"]>()
      .mockRejectedValue(transient);
    const api = {
      listConversationCycleCounts,
      listConversationCycles: vi.fn(async () => [createSession({})]),
      subscribeEvents: vi.fn(() => vi.fn()),
    } as unknown as CrmConversationApi;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AccountSessionProvider session={createSessionBootstrap()}>
        {children}
      </AccountSessionProvider>
    );
    const { result } = renderHook(() => useCrmInbox(api), { wrapper });

    await act(async () => result.current.refreshSessions());
    await waitFor(() => expect(result.current.error).toBe(transient));
    const currentErrorId = result.current.errorId;
    expect(currentErrorId).toMatch(/^crm-error-/);

    act(() => result.current.clearError("outro-erro"));
    expect(result.current.error).toBe(transient);

    act(() => result.current.clearError(currentErrorId!));
    expect(result.current.error).toBeNull();
    expect(result.current.errorId).toBeNull();
  });

  it("makes a transient connection error dismissible by its own identity", () => {
    const transient = new Error("conexão indisponível");
    hookMocks.connections.error = transient;
    const api = {
      listConversationCycleCounts: vi.fn(
        async () => defaultConversationCycleCounts,
      ),
      subscribeEvents: vi.fn(() => vi.fn()),
    } as unknown as CrmConversationApi;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AccountSessionProvider session={createSessionBootstrap()}>
        {children}
      </AccountSessionProvider>
    );
    const { result } = renderHook(() => useCrmInbox(api), { wrapper });

    expect(result.current.error).toBe(transient);
    expect(result.current.errorId).toMatch(/^crm-error-/);
    act(() => result.current.clearError(result.current.errorId!));
    expect(hookMocks.connections.clearError).toHaveBeenCalledOnce();
  });

  it("coerces inaccessible queue filters to Meus", async () => {
    const api = {
      listConversationCycleCounts: vi.fn(
        async () => defaultConversationCycleCounts,
      ),
      listConversationCycles: vi.fn(async () => []),
      subscribeEvents: vi.fn(() => vi.fn()),
    } as unknown as CrmConversationApi;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AccountSessionProvider session={createSessionBootstrap(false)}>
        {children}
      </AccountSessionProvider>
    );
    const { result } = renderHook(() => useCrmInbox(api), { wrapper });

    await act(async () => result.current.refreshSessions());

    await waitFor(() => expect(api.listConversationCycles).toHaveBeenCalled());
    expect(result.current.quickFilter).toBe("mine");
    expect(api.listConversationCycles).toHaveBeenLastCalledWith(
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
    "hides an active cycle after realtime assigns it to %s for a restricted user",
    async (assignedUserId) => {
      hookMocks.messages.evictSessionMessages.mockClear();
      let onEvent: ((event: CrmRealtimeEvent) => void) | undefined;
      const mine = createSession({
        assignedUserId: "user-current",
        revision: 1,
      });
      const api = {
        listConversationCycleCounts: vi.fn(
          async () => defaultConversationCycleCounts,
        ),
        listConversationCycles: vi.fn(async () => [mine]),
        subscribeEvents: vi.fn(
          (input: Parameters<CrmConversationApi["subscribeEvents"]>[0]) => {
            onEvent = input.onEvent;
            return vi.fn();
          },
        ),
      } as unknown as CrmConversationApi;
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AccountSessionProvider session={createSessionBootstrap(false)}>
          {children}
        </AccountSessionProvider>
      );
      const { result } = renderHook(() => useCrmInbox(api), {
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
          cycle: createSession({ assignedUserId, revision: 2 }),
          type: "cycle",
        });
      });

      await waitFor(() => {
        expect(result.current.conversationCycles).toEqual([]);
        expect(result.current.activeSession).toBeNull();
      });
      expect(hookMocks.messages.evictSessionMessages).toHaveBeenCalledWith(
        mine.id,
      );
    },
  );

  it("reconciles a missed access revocation after SSE reconnects", async () => {
    hookMocks.messages.evictSessionMessages.mockClear();
    let onStatus:
      | ((status: "connected" | "connecting" | "degraded" | "offline") => void)
      | undefined;
    let conversationCycles = [
      createSession({ assignedUserId: "user-current", revision: 1 }),
    ];
    const api = {
      listConversationCycleCounts: vi.fn(
        async () => defaultConversationCycleCounts,
      ),
      listConversationCycles: vi.fn(async () => conversationCycles),
      subscribeEvents: vi.fn(
        (input: Parameters<CrmConversationApi["subscribeEvents"]>[0]) => {
          onStatus = input.onStatus;
          return vi.fn();
        },
      ),
    } as unknown as CrmConversationApi;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AccountSessionProvider session={createSessionBootstrap(false)}>
        {children}
      </AccountSessionProvider>
    );
    const { result } = renderHook(() => useCrmInbox(api), { wrapper });

    await act(async () => result.current.refreshSessions());
    await waitFor(() =>
      expect(result.current.conversationCycles).toHaveLength(1),
    );
    conversationCycles = [];

    act(() => onStatus?.("connected"));
    act(() => onStatus?.("connecting"));
    act(() => onStatus?.("connected"));

    await waitFor(() => {
      expect(result.current.conversationCycles).toHaveLength(0);
      expect(result.current.activeSession).toBeNull();
    });
    expect(hookMocks.messages.evictSessionMessages).toHaveBeenCalledWith(
      "cycle-1",
    );
  });

  it("keeps cached pagination while SSE reconnects", async () => {
    hookMocks.messages.evictSessionMessages.mockClear();
    let onStatus:
      | ((status: "connected" | "connecting" | "degraded" | "offline") => void)
      | undefined;
    const mine = createSession({
      assignedUserId: "user-current",
      revision: 1,
    });
    let conversationCycles = [mine];
    const api = {
      listConversationCycleCounts: vi.fn(
        async () => defaultConversationCycleCounts,
      ),
      listConversationCycles: vi.fn(async () => conversationCycles),
      subscribeEvents: vi.fn(
        (input: Parameters<CrmConversationApi["subscribeEvents"]>[0]) => {
          onStatus = input.onStatus;
          return vi.fn();
        },
      ),
    } as unknown as CrmConversationApi;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AccountSessionProvider session={createSessionBootstrap(false)}>
        {children}
      </AccountSessionProvider>
    );
    const { result } = renderHook(() => useCrmInbox(api), { wrapper });

    await act(async () => result.current.refreshSessions());
    await waitFor(() => expect(result.current.activeSession?.id).toBe(mine.id));
    conversationCycles = Array.from({ length: 40 }, (_, index) =>
      createSession({
        assignedUserId: "user-current",
        id: `cycle-page-${index}`,
      }),
    );

    act(() => onStatus?.("connected"));

    await waitFor(() =>
      expect(result.current.conversationCycles).toHaveLength(1),
    );
    expect(result.current.activeSession?.id).toBe(mine.id);
    expect(hookMocks.messages.evictSessionMessages).not.toHaveBeenCalled();
  });

  it("appends the next conversation page without losing the active selection", async () => {
    const firstPage = Array.from({ length: 40 }, (_, index) =>
      createSession({ id: `cycle-${index}`, assignedUserId: "user-current" }),
    );
    const lastCycle = createSession({
      id: "cycle-40",
      assignedUserId: "user-current",
    });
    const api = {
      listConversationCycleCounts: vi.fn(
        async () => defaultConversationCycleCounts,
      ),
      listConversationCycles: vi.fn(async (input: { offset?: number }) =>
        input.offset === 40 ? [lastCycle] : firstPage,
      ),
      subscribeEvents: vi.fn(() => vi.fn()),
    } as unknown as CrmConversationApi;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AccountSessionProvider session={createSessionBootstrap(false)}>
        {children}
      </AccountSessionProvider>
    );
    const { result } = renderHook(() => useCrmInbox(api), { wrapper });

    await act(async () => result.current.refreshSessions());
    await waitFor(() => expect(result.current.hasMoreSessions).toBe(true));
    act(() => result.current.setActiveCycleId("cycle-5"));
    await act(async () => result.current.loadMoreSessions());

    expect(api.listConversationCycles).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 40, offset: 40 }),
    );
    expect(result.current.conversationCycles).toHaveLength(41);
    expect(result.current.activeCycleId).toBe("cycle-5");
    expect(result.current.hasMoreSessions).toBe(false);
  });

  it.each([
    { authorized: true, expectedCycleId: "cycle-deep-link" },
    { authorized: false, expectedCycleId: null },
  ])(
    "shows a deep link only when the server authorizes it ($authorized)",
    async ({ authorized, expectedCycleId }) => {
      window.location.hash = "#/crm?cycleId=cycle-deep-link";
      const deepLinked = createSession({
        assignedUserId: "user-current",
        revision: 1,
      });
      deepLinked.id = "cycle-deep-link";
      const api = {
        listConversationCycleCounts: vi.fn(
          async () => defaultConversationCycleCounts,
        ),
        listConversationCycles: vi.fn(
          async (input: { cycleId?: string | number }) =>
            input.cycleId === "cycle-deep-link" && authorized
              ? [deepLinked]
              : [],
        ),
        subscribeEvents: vi.fn(() => vi.fn()),
      } as unknown as CrmConversationApi;
      const wrapper = ({ children }: { children: ReactNode }) => (
        <AccountSessionProvider session={createSessionBootstrap(false)}>
          {children}
        </AccountSessionProvider>
      );
      const { result } = renderHook(() => useCrmInbox(api), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.activeSession?.id ?? null).toBe(expectedCycleId);
      });
      expect(api.listConversationCycles).toHaveBeenCalledWith({
        limit: 1,
        offset: 0,
        cycleId: "cycle-deep-link",
      });
    },
  );

  it("restores authorized conversations when browser route state changes", async () => {
    const cycles = ["cycle-route-1", "cycle-route-2"].map((id) => {
      const cycle = createSession({
        assignedUserId: "user-current",
        revision: 1,
      });
      cycle.id = id;
      return cycle;
    });
    const api = {
      listConversationCycleCounts: vi.fn(
        async () => defaultConversationCycleCounts,
      ),
      listConversationCycles: vi.fn(
        async (input: { cycleId?: string | number }) =>
          cycles.filter((cycle) => cycle.id === input.cycleId),
      ),
      subscribeEvents: vi.fn(() => vi.fn()),
    } as unknown as CrmConversationApi;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AccountSessionProvider session={createSessionBootstrap(false)}>
        {children}
      </AccountSessionProvider>
    );
    const { result, rerender } = renderHook(
      ({ cycleId }: { cycleId: string | null }) => useCrmInbox(api, cycleId),
      {
        initialProps: { cycleId: "cycle-route-1" as string | null },
        wrapper,
      },
    );

    await waitFor(() =>
      expect(result.current.activeSession?.id).toBe("cycle-route-1"),
    );
    rerender({ cycleId: "cycle-route-2" });
    await waitFor(() =>
      expect(result.current.activeSession?.id).toBe("cycle-route-2"),
    );

    rerender({ cycleId: "cycle-route-1" });
    await waitFor(() =>
      expect(result.current.activeSession?.id).toBe("cycle-route-1"),
    );
    expect(api.listConversationCycles).toHaveBeenCalledTimes(2);

    rerender({ cycleId: null });
    await waitFor(() => expect(result.current.activeCycleId).toBeNull());
  });

  it("ignores a stale deep-link response after browser navigation", async () => {
    const pending = new Map<string, (cycles: CrmConversationCycle[]) => void>();
    const api = {
      listConversationCycleCounts: vi.fn(
        async () => defaultConversationCycleCounts,
      ),
      listConversationCycles: vi.fn(
        (input: { cycleId?: string | number }) =>
          new Promise<CrmConversationCycle[]>((resolve) => {
            pending.set(String(input.cycleId), resolve);
          }),
      ),
      subscribeEvents: vi.fn(() => vi.fn()),
    } as unknown as CrmConversationApi;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AccountSessionProvider session={createSessionBootstrap(false)}>
        {children}
      </AccountSessionProvider>
    );
    const { result, rerender } = renderHook(
      ({ cycleId }: { cycleId: string }) => useCrmInbox(api, cycleId),
      { initialProps: { cycleId: "cycle-old" }, wrapper },
    );
    await waitFor(() => expect(pending.has("cycle-old")).toBe(true));

    rerender({ cycleId: "cycle-new" });
    await waitFor(() => expect(pending.has("cycle-new")).toBe(true));
    const newest = createSession({ assignedUserId: "user-current" });
    newest.id = "cycle-new";
    await act(async () => pending.get("cycle-new")?.([newest]));
    await waitFor(() =>
      expect(result.current.activeSession?.id).toBe("cycle-new"),
    );

    const stale = createSession({ assignedUserId: "user-current" });
    stale.id = "cycle-old";
    await act(async () => pending.get("cycle-old")?.([stale]));
    expect(result.current.activeSession?.id).toBe("cycle-new");
  });

  it("queries and subscribes store-wide while the aggregate connection filter is active", async () => {
    hookMocks.connections.connections = [
      createConnection({ id: "connection-1", isDefault: true }),
      createConnection({ displayName: "Secundária", id: "connection-2" }),
    ];
    const api = {
      listConversationCycleCounts: vi.fn(
        async () => defaultConversationCycleCounts,
      ),
      listConversationCycles: vi.fn(async () => []),
      subscribeEvents: vi.fn(() => vi.fn()),
    } as unknown as CrmConversationApi;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AccountSessionProvider session={createSessionBootstrap()}>
        {children}
      </AccountSessionProvider>
    );
    const { result } = renderHook(() => useCrmInbox(api), { wrapper });

    await act(async () => result.current.refreshSessions());

    const lastListQuery = vi
      .mocked(api.listConversationCycles)
      .mock.calls.at(-1)?.[0];
    expect(lastListQuery).not.toHaveProperty("connectionId");
    const lastCountsQuery = vi
      .mocked(api.listConversationCycleCounts)
      .mock.calls.at(-1)?.[0];
    expect(lastCountsQuery).not.toHaveProperty("connectionId");
    expect(api.subscribeEvents).toHaveBeenCalledTimes(1);
    expect(
      vi.mocked(api.subscribeEvents).mock.calls[0]?.[0],
    ).not.toHaveProperty("connectionId");
  });

  it("scopes queries and the subscription to the selected connection", async () => {
    hookMocks.connections.connections = [
      createConnection({ id: "connection-1", isDefault: true }),
      createConnection({ displayName: "Secundária", id: "connection-2" }),
    ];
    const api = {
      listConversationCycleCounts: vi.fn(
        async () => defaultConversationCycleCounts,
      ),
      listConversationCycles: vi.fn(async () => []),
      subscribeEvents: vi.fn(() => vi.fn()),
    } as unknown as CrmConversationApi;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AccountSessionProvider session={createSessionBootstrap()}>
        {children}
      </AccountSessionProvider>
    );
    const { result } = renderHook(() => useCrmInbox(api), { wrapper });

    act(() => result.current.setConnectionFilterId("connection-2"));
    await act(async () => result.current.refreshSessions());

    expect(result.current.connectionFilterId).toBe("connection-2");
    expect(api.listConversationCycles).toHaveBeenLastCalledWith(
      expect.objectContaining({ connectionId: "connection-2" }),
    );
    expect(api.listConversationCycleCounts).toHaveBeenLastCalledWith(
      expect.objectContaining({ connectionId: "connection-2" }),
    );
    expect(api.subscribeEvents).toHaveBeenLastCalledWith(
      expect.objectContaining({ connectionId: "connection-2" }),
    );
  });

  it("keeps global queue filters for read_unassigned actors without assign", async () => {
    const api = {
      listConversationCycleCounts: vi.fn(
        async () => defaultConversationCycleCounts,
      ),
      listConversationCycles: vi.fn(async () => []),
      subscribeEvents: vi.fn(() => vi.fn()),
    } as unknown as CrmConversationApi;
    const session = createSessionBootstrap(false);
    session.defaultStore = {
      ...session.defaultStore!,
      effectivePermissions: [
        "crm.conversations.read",
        "crm.conversations.read_unassigned",
      ],
    };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AccountSessionProvider session={session}>
        {children}
      </AccountSessionProvider>
    );
    const { result } = renderHook(() => useCrmInbox(api), { wrapper });

    act(() => {
      result.current.setQuickFilter("all");
      result.current.setOtherAssigneeId("user-other");
    });

    expect(result.current.quickFilter).toBe("all");
    expect(result.current.otherAssigneeId).toBe("user-other");
    await act(async () => result.current.refreshSessions());
    expect(api.listConversationCycles).toHaveBeenLastCalledWith(
      expect.objectContaining({ filter: "all" }),
    );
  });

  it("resets a connection filter the member-restricted agent cannot browse", async () => {
    hookMocks.connections.connections = [
      createConnection({ id: "connection-1", memberUserIds: ["user-current"] }),
      createConnection({
        displayName: "Restrita",
        id: "connection-2",
        isDefault: false,
        memberUserIds: ["user-other"],
      }),
    ];
    const api = {
      listConversationCycleCounts: vi.fn(
        async () => defaultConversationCycleCounts,
      ),
      listConversationCycles: vi.fn(async () => []),
      subscribeEvents: vi.fn(() => vi.fn()),
    } as unknown as CrmConversationApi;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <AccountSessionProvider session={createSessionBootstrap(false)}>
        {children}
      </AccountSessionProvider>
    );
    const { result } = renderHook(() => useCrmInbox(api), { wrapper });

    act(() => result.current.setConnectionFilterId("connection-2"));

    await waitFor(() => expect(result.current.connectionFilterId).toBeNull());
  });
});

function createConnection(
  overrides: Record<string, unknown> = {},
): (typeof hookMocks.connections.connections)[number] {
  return {
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
    ...overrides,
  } as (typeof hookMocks.connections.connections)[number];
}

function createSession(
  input: Partial<CrmConversationCycle>,
): CrmConversationCycle {
  return {
    channel: "whatsapp",
    connection: input.connection ?? {
      id: "connection-1",
      displayName: "Loja",
      provider: "zapi",
      status: "active",
    },
    id: "cycle-1",
    lastMessageAt: "2026-08-17T12:00:00.000Z",
    status: "ACTIVE",
    ...input,
  };
}

function createCounts(input: {
  fresh: number;
  mine: number;
  total: number;
}): CrmConversationCycleCounts {
  return {
    ...defaultConversationCycleCounts,
    filters: {
      ...defaultConversationCycleCounts.filters,
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
        ...(canAssign ? ["crm.conversations.assign"] : []),
        "crm.conversations.read",
        "crm.conversations.read",
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
