// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SessionBootstrap } from "../account/apiClient";
import { AccountSessionProvider } from "../account/accountSession";
import { persistCurrentStoreSlug } from "../account/currentStore";
import type { CrmConversationApi } from "./crmConversationApi";
import { CrmInbox } from "./CrmInbox";
import type { useCrmInbox } from "./useCrmInbox";

const inboxMock = vi.hoisted(() => ({
  captureWorkspace(node: HTMLButtonElement | null) {
    if (!node || inboxMock.workspaceNodes.has(node)) return;
    inboxMock.workspaceNodes.add(node);
    inboxMock.workspaceMounts += 1;
  },
  current: null as unknown,
  routedCycleId: null as string | null,
  workspaceMounts: 0,
  workspaceNodes: new WeakSet<HTMLButtonElement>(),
}));

vi.mock("./useCrmInbox", () => ({
  useCrmInbox: (_api: unknown, routedCycleId: string | null) => {
    inboxMock.routedCycleId = routedCycleId;
    return inboxMock.current;
  },
}));
vi.mock("./CrmScopedNav", () => ({
  CrmScopedNav: ({
    activeScope,
    connectionLabel,
    onChange,
  }: {
    activeScope: string;
    connectionLabel: string;
    onChange: (scope: "statistics") => void;
  }) => (
    <>
      <output aria-label="Status da sincronização">{connectionLabel}</output>
      <output aria-label="Escopo ativo">{activeScope}</output>
      <button onClick={() => onChange("statistics")} type="button">
        Abrir estatísticas
      </button>
    </>
  ),
}));
vi.mock("./CrmConversationWorkspace", () => ({
  CrmConversationWorkspace: ({
    onCycleChange,
  }: {
    onCycleChange: (cycleId: string) => void;
  }) => (
    <button
      onClick={() => onCycleChange("cycle-2")}
      ref={inboxMock.captureWorkspace}
      type="button"
    >
      Abrir conversa
    </button>
  ),
}));
vi.mock("./CrmStatsPage", () => ({
  CrmStatsPage: () => <div>Estatísticas</div>,
}));
vi.mock("./crmVisitsRuntimeApi", () => ({
  createRuntimeCrmVisitsApi: () => ({}),
}));
vi.mock("./crmComposioOAuth", () => ({
  readPendingComposioConnectionId: () => null,
}));
vi.mock("./crmOlxOauthReturn", () => ({
  consumeCrmOlxOauthReturn: () => null,
}));

describe("CrmInbox synchronization status", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    localStorage.clear();
    inboxMock.workspaceMounts = 0;
    inboxMock.workspaceNodes = new WeakSet<HTMLButtonElement>();
    window.history.replaceState(null, "", "/");
  });

  it("shows Reconectando until successful stream reconciliation becomes Sincronizado", () => {
    inboxMock.current = createInbox("connecting");
    const rendered = render(
      <CrmInbox api={{} as CrmConversationApi} productApi={{} as never} />,
    );

    expect(screen.getByLabelText("Status da sincronização")).toHaveTextContent(
      "Reconectando",
    );

    inboxMock.current = createInbox("connected");
    rendered.rerender(
      <CrmInbox api={{} as CrmConversationApi} productApi={{} as never} />,
    );

    expect(screen.getByLabelText("Status da sincronização")).toHaveTextContent(
      "Sincronizado",
    );
  });

  it("keeps sandbox history visibly read-only even when realtime is connected", () => {
    inboxMock.current = {
      ...createInbox("connected"),
      connections: [
        {
          displayName: "WhatsApp fictício para demo de UI",
          id: "connection-1",
          provider: "meta_cloud",
          state: "sandbox",
        },
      ],
    } as ReturnType<typeof useCrmInbox>;

    render(
      <CrmInbox api={{} as CrmConversationApi} productApi={{} as never} />,
    );

    expect(screen.getByLabelText("Status da sincronização")).toHaveTextContent(
      "Demonstração · somente leitura",
    );
  });

  it("keeps connection and routing failures inline", () => {
    inboxMock.current = createInbox("connected", new Error("backend down"));

    render(
      <CrmInbox api={{} as CrmConversationApi} productApi={{} as never} />,
    );

    expect(screen.getByRole("note")).toHaveClass("crm-note");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("backend down")).toBeVisible();
  });

  it("expires the matching transient inbox error after ten seconds", async () => {
    vi.useFakeTimers();
    const clearError = vi.fn();
    inboxMock.current = {
      ...createInbox("connected", new Error("send failed")),
      clearError,
      errorId: "error-1",
    } as ReturnType<typeof useCrmInbox>;

    render(
      <CrmInbox api={{} as CrmConversationApi} productApi={{} as never} />,
    );
    expect(screen.getByRole("alert")).toHaveAttribute("data-ui", "toast");

    await act(async () => vi.advanceTimersByTime(10_000));

    expect(clearError).toHaveBeenCalledWith("error-1");
  });

  it("clears the matching transient inbox error when its toast is closed", async () => {
    const clearError = vi.fn();
    const user = userEvent.setup();
    inboxMock.current = {
      ...createInbox("connected", new Error("send failed")),
      clearError,
      errorId: "error-2",
    } as ReturnType<typeof useCrmInbox>;

    render(
      <CrmInbox api={{} as CrmConversationApi} productApi={{} as never} />,
    );
    await user.click(
      screen.getByRole("button", { name: "Fechar notificação" }),
    );

    expect(clearError).toHaveBeenCalledWith("error-2");
  });

  it("keeps scope and selected conversation synchronized with browser history", async () => {
    const user = userEvent.setup();
    inboxMock.current = createInbox("connected");
    window.history.replaceState(
      null,
      "",
      "#/crm?surface=conversations&cycleId=cycle-1",
    );
    render(
      <CrmInbox api={{} as CrmConversationApi} productApi={{} as never} />,
    );

    expect(inboxMock.routedCycleId).toBe("cycle-1");
    await user.click(screen.getByRole("button", { name: "Abrir conversa" }));
    expect(window.location.hash).toBe(
      "#/crm?surface=conversations&cycleId=cycle-2",
    );
    expect(inboxMock.routedCycleId).toBe("cycle-2");

    await user.click(
      screen.getByRole("button", { name: "Abrir estatísticas" }),
    );
    expect(window.location.hash).toBe(
      "#/crm?surface=conversations&scope=statistics",
    );
    expect(screen.getByLabelText("Escopo ativo")).toHaveTextContent(
      "statistics",
    );
    expect(inboxMock.routedCycleId).toBeNull();

    act(() => {
      window.history.replaceState(
        null,
        "",
        "#/crm?surface=conversations&cycleId=cycle-1",
      );
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    await waitFor(() => expect(inboxMock.routedCycleId).toBe("cycle-1"));
    expect(screen.getByLabelText("Escopo ativo")).toHaveTextContent(
      "conversations",
    );
  });

  it("remounts all store-scoped CRM state after an agency store switch", () => {
    inboxMock.current = createInbox("connected");
    const session = createAgencySession();
    persistCurrentStoreSlug("store-one", session.user.clerkUserId);
    const rendered = render(
      <AccountSessionProvider session={session}>
        <CrmInbox api={{} as CrmConversationApi} productApi={{} as never} />
      </AccountSessionProvider>,
    );
    expect(inboxMock.workspaceMounts).toBe(1);

    persistCurrentStoreSlug("store-two", session.user.clerkUserId);
    rendered.rerender(
      <AccountSessionProvider session={session}>
        <CrmInbox api={{} as CrmConversationApi} productApi={{} as never} />
      </AccountSessionProvider>,
    );

    expect(inboxMock.workspaceMounts).toBe(2);
  });
});

function createInbox(
  realtimeStatus: "connected" | "connecting",
  error: Error | null = null,
) {
  return {
    availableTags: [],
    connections: [
      {
        displayName: "Loja",
        id: "connection-1",
        provider: "zapi",
        state: "active",
      },
    ],
    connectionError: null,
    connectionId: "connection-1",
    connectionIsLoading: false,
    clearError: vi.fn(),
    error,
    errorId: null,
    hasConnection: true,
    permissions: {
      canCampaignRead: false,
      canIntegrationsManage: false,
      canList: true,
      canScheduleRead: false,
      canVisitsRead: false,
    },
    realtimeStatus,
    conversationCycles: [],
  } as unknown as ReturnType<typeof useCrmInbox>;
}

function createAgencySession(): SessionBootstrap {
  const store = (id: string, slug: string) => ({
    effectivePermissions: ["crm.conversations.read"],
    role: "agency" as const,
    status: "active" as const,
    storeId: id,
    storeName: id,
    storeSlug: slug,
    tenantId: "tenant-agency",
    tenantName: "Agência",
  });
  const stores = [store("store-1", "store-one"), store("store-2", "store-two")];
  return {
    defaultStore: stores[0] ?? null,
    needsOnboarding: false,
    platformAdmin: false,
    stores,
    tenantMemberships: [],
    user: {
      clerkUserId: "clerk-agency",
      email: "agency@loja.test",
      id: "user-agency",
      name: "Agência",
    },
  };
}
