// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CrmConversationApi } from "./crmConversationApi";
import { CrmInbox } from "./CrmInbox";
import type { useCrmInbox } from "./useCrmInbox";

const inboxMock = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("./useCrmInbox", () => ({
  useCrmInbox: () => inboxMock.current,
}));
vi.mock("./CrmScopedNav", () => ({
  CrmScopedNav: ({ connectionLabel }: { connectionLabel: string }) => (
    <output aria-label="Status da sincronização">{connectionLabel}</output>
  ),
}));
vi.mock("./CrmConversationWorkspace", () => ({
  CrmConversationWorkspace: () => <div>Conversas</div>,
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
  afterEach(cleanup);

  it("shows Reconciliando until successful stream reconciliation becomes Sincronizado", () => {
    inboxMock.current = createInbox("connecting");
    const rendered = render(
      <CrmInbox api={{} as CrmConversationApi} productApi={{} as never} />,
    );

    expect(screen.getByLabelText("Status da sincronização")).toHaveTextContent(
      "Reconciliando",
    );

    inboxMock.current = createInbox("connected");
    rendered.rerender(
      <CrmInbox api={{} as CrmConversationApi} productApi={{} as never} />,
    );

    expect(screen.getByLabelText("Status da sincronização")).toHaveTextContent(
      "Sincronizado",
    );
  });
});

function createInbox(realtimeStatus: "connected" | "connecting") {
  return {
    availableTags: [],
    connectionError: null,
    connectionId: "connection-1",
    connectionIsLoading: false,
    error: null,
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
