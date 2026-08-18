// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import { CrmWhatsappInbox } from "./CrmWhatsappInbox";
import type { useCrmWhatsappInbox } from "./useCrmWhatsappInbox";

const inboxMock = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("./useCrmWhatsappInbox", () => ({
  useCrmWhatsappInbox: () => inboxMock.current,
}));
vi.mock("./CrmWhatsappScopedNav", () => ({
  CrmWhatsappScopedNav: ({ connectionLabel }: { connectionLabel: string }) => (
    <output aria-label="Status da sincronização">{connectionLabel}</output>
  ),
}));
vi.mock("./CrmWhatsappConversationWorkspace", () => ({
  CrmWhatsappConversationWorkspace: () => <div>Conversas</div>,
}));
vi.mock("./crmVisitsRuntimeApi", () => ({
  createRuntimeCrmVisitsApi: () => ({}),
}));
vi.mock("./crmWhatsappComposioOAuth", () => ({
  readPendingComposioConnectionId: () => null,
}));
vi.mock("./crmOlxOauthReturn", () => ({
  consumeCrmOlxOauthReturn: () => null,
}));

describe("CrmWhatsappInbox synchronization status", () => {
  afterEach(cleanup);

  it("shows Reconciliando until successful stream reconciliation becomes Sincronizado", () => {
    inboxMock.current = createInbox("connecting");
    const rendered = render(
      <CrmWhatsappInbox api={{} as CrmWhatsappApi} productApi={{} as never} />,
    );

    expect(screen.getByLabelText("Status da sincronização")).toHaveTextContent(
      "Reconciliando",
    );

    inboxMock.current = createInbox("connected");
    rendered.rerender(
      <CrmWhatsappInbox api={{} as CrmWhatsappApi} productApi={{} as never} />,
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
    sessions: [],
  } as unknown as ReturnType<typeof useCrmWhatsappInbox>;
}
