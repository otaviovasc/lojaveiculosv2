// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmConnectionFilter } from "./CrmConnectionFilter";
import type { CrmProviderConnection } from "./crmConversationTypes";

describe("CrmConnectionFilter", () => {
  afterEach(cleanup);

  it("does not visually select the only connection without a persisted route", () => {
    render(
      <CrmConnectionFilter
        connectionFilterId={null}
        connections={[connection(false)]}
        fallbackConnectionId={null}
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Filtrar por conexão" }),
    ).toHaveAttribute("title", "Canal: Nenhum canal pronto");
  });

  it("shows the only connection when the backend marks it as default", () => {
    render(
      <CrmConnectionFilter
        connectionFilterId={null}
        connections={[connection(true)]}
        fallbackConnectionId={null}
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Filtrar por conexão" }),
    ).toHaveAttribute("title", "Canal: WhatsApp");
  });
});

function connection(isDefault: boolean): CrmProviderConnection {
  return {
    channel: "whatsapp",
    displayName: "Z-API principal",
    externalConnectionId: "instance-1",
    externalInstanceId: "instance-1",
    id: "connection-1",
    isDefault,
    live: {
      checkedAt: "2026-08-17T12:00:00.000Z",
      connected: true,
      connectedPhone: "+5511999990000",
      providerStatus: "connected",
      smartphoneConnected: true,
    },
    phone: "+5511999990000",
    provider: "zapi",
    readiness: { ready: true, reason: null, reasonCode: "ready" },
    ready: true,
    state: "active",
    status: "active",
    webhookUrl: "https://api.example/webhook",
  };
}
