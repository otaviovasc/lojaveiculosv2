// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CrmProvider } from "@lojaveiculosv2/shared";
import { CrmConnectionAdmin } from "./CrmConnectionAdmin";
import type { CrmProviderConnection } from "./crmConversationTypes";

describe("CrmConnectionAdmin", () => {
  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
  });

  it("keeps configured Z-API credentials write-only in the manage dialog", () => {
    render(
      <CrmConnectionAdmin
        connections={[createConnection("zapi", "connected", true)]}
        onRefresh={vi.fn(async () => undefined)}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /CRM channel/i }));
    expect(screen.getByText("Z-API: online")).toBeVisible();
    expect(screen.queryByLabelText(/ID da instância/i)).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/Token da instância/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/Token do cliente/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/webhook/i)).not.toBeInTheDocument();
  });

  it("closes the manage dialog with Escape and restores focus", () => {
    render(
      <CrmConnectionAdmin
        connections={[createConnection("zapi", "connected", true)]}
        onRefresh={vi.fn(async () => undefined)}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /CRM channel/i }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeVisible();
    expect(dialog.contains(document.activeElement)).toBe(true);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps management and other channel choices reachable after Z-API connects", async () => {
    render(
      <CrmConnectionAdmin
        connections={[createConnection("zapi", "connected", true)]}
        onRefresh={vi.fn(async () => undefined)}
        selfService={createSelfService()}
      />,
    );

    const zapiCard = await screen.findByRole("button", {
      name: /CRM channel/i,
    });
    expect(zapiCard).toBeEnabled();
    expect(screen.queryByText("Já conectado")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /WhatsApp Oficial/i }),
    ).toBeVisible();
    fireEvent.click(zapiCard);
    expect(await screen.findByRole("dialog")).toBeVisible();
    expect(screen.getByText("Z-API: online")).toBeVisible();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: /CRM channel/i }),
    ).toBeEnabled();
  });

  it("keeps the selected connection management view open across polling refreshes", async () => {
    const connection = createConnection("zapi", "connected", true);
    const onRefresh = vi.fn(async () => undefined);
    const { rerender } = render(
      <CrmConnectionAdmin connections={[connection]} onRefresh={onRefresh} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /CRM channel/i }));
    expect(screen.getByRole("dialog")).toBeVisible();

    rerender(
      <CrmConnectionAdmin
        connections={[{ ...connection, live: { ...connection.live! } }]}
        onRefresh={onRefresh}
      />,
    );

    expect(screen.getByRole("dialog")).toBeVisible();
    expect(screen.getByText("Z-API: online")).toBeVisible();
  });

  it("keeps OLX Chat human-readable and exposes no provider setup controls", () => {
    render(
      <CrmConnectionAdmin
        connections={[createConnection("olx", "connected", true)]}
        onRefresh={vi.fn(async () => undefined)}
      />,
    );

    expect(screen.getAllByText("OLX Chat").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /OLX/i }));
    expect(
      screen.getByRole("heading", { name: "OLX Chat · OLX" }),
    ).toBeVisible();
    expect(screen.queryByLabelText(/ID da instância/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/webhook/i)).not.toBeInTheDocument();
  });
});

function createConnection(
  provider: CrmProvider,
  status: "connected" | "disconnected",
  configured: boolean,
): CrmProviderConnection {
  return {
    channel:
      provider === "olx"
        ? "olx_chat"
        : provider === "meta_cloud"
          ? "instagram"
          : "whatsapp",
    credentials: {
      apiBaseUrlEnv: null,
      clientTokenEnv: null,
      instanceIdEnv: null,
      instanceTokenEnv: null,
      mode: configured ? "stored" : null,
      storedInstanceConfigured: configured,
    },
    displayName: provider === "olx" ? "OLX" : "CRM channel",
    externalConnectionId: null,
    externalInstanceId: configured ? "stored-instance" : null,
    id: `${provider}-connection`,
    live: {
      checkedAt: "2026-08-10T12:00:00.000Z",
      connected: status === "connected",
      connectedPhone: status === "connected" ? "5511999999999" : null,
      providerStatus: status,
      smartphoneConnected: status === "connected",
    },
    phone: status === "connected" ? "5511999999999" : null,
    provider,
    ready: status === "connected",
    readiness: {
      ready: status === "connected",
      reason: status === "connected" ? null : "Aguardando conexão.",
      reasonCode: status === "connected" ? null : "not_connected",
    },
    setup: configured
      ? {
          attemptCount: 0,
          configuredAt: null,
          lastErrorCode: null,
          requestedAt: "2026-08-10T12:00:00.000Z",
          requiredTypes: [],
          status: "configured",
          succeededTypes: [],
          supportCode: "TEST",
          updatedAt: "2026-08-10T12:00:00.000Z",
          version: 1,
        }
      : null,
    status: status === "connected" ? "active" : "disconnected",
    webhookUrl: null,
  };
}

function createSelfService() {
  return {
    allowance: { limit: 1, remaining: 0, used: 1 },
    availableSetups: [
      {
        broker: "composio" as const,
        channel: "whatsapp" as const,
        provider: "meta_cloud" as const,
      },
    ],
    canPair: true,
    canSetup: true,
    handlers: {
      onAuthorizeComposio: vi.fn(),
      onCompleteComposio: vi.fn(),
      onConfigureZapiWebhooks: vi.fn(),
      onCreate: vi.fn(),
      onRefreshConnections: vi.fn(async () => undefined),
      onRequestZapiPairingCode: vi.fn(),
      onRequestZapiPairingQr: vi.fn(),
      onSelectComposioSender: vi.fn(),
    },
  };
}
