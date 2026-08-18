// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmWhatsappConnectionAdmin } from "./CrmWhatsappConnectionAdmin";
import type {
  CrmWhatsappProvider,
  CrmWhatsappProviderConnection,
} from "./crmWhatsappTypes";

describe("CrmWhatsappConnectionAdmin", () => {
  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
  });

  it("keeps configured Z-API credentials write-only in the manage dialog", () => {
    render(
      <CrmWhatsappConnectionAdmin
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
      <CrmWhatsappConnectionAdmin
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
      <CrmWhatsappConnectionAdmin
        connections={[createConnection("zapi", "connected", true)]}
        onRefresh={vi.fn(async () => undefined)}
        selfService={createSelfService()}
      />,
    );

    const zapiCard = await screen.findByRole("button", {
      name: /Já conectado/i,
    });
    expect(zapiCard).toBeEnabled();
    expect(screen.getByText("Já conectado")).toBeVisible();
    expect(
      screen.getByRole("button", { name: /WhatsApp Oficial/i }),
    ).toBeVisible();
    fireEvent.click(zapiCard);
    expect(await screen.findByRole("dialog")).toBeVisible();
    expect(
      screen.getAllByText("Conectar WhatsApp · Z-API").length,
    ).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Ver outros canais" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: /Já conectado/i }),
    ).toBeEnabled();
  });

  it("keeps the selected connection management view open across polling refreshes", async () => {
    const connection = createConnection("zapi", "connected", true);
    const onRefresh = vi.fn(async () => undefined);
    const { rerender } = render(
      <CrmWhatsappConnectionAdmin
        connections={[connection]}
        onRefresh={onRefresh}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /CRM channel/i }));
    expect(screen.getByRole("dialog")).toBeVisible();

    rerender(
      <CrmWhatsappConnectionAdmin
        connections={[{ ...connection, live: { ...connection.live } }]}
        onRefresh={onRefresh}
      />,
    );

    expect(screen.getByRole("dialog")).toBeVisible();
    expect(screen.getByText("Z-API: online")).toBeVisible();
  });

  it("keeps OLX Chat human-readable and exposes no provider setup controls", () => {
    render(
      <CrmWhatsappConnectionAdmin
        connections={[createConnection("olx_chat", "connected", true)]}
        onRefresh={vi.fn(async () => undefined)}
      />,
    );

    expect(screen.getAllByText("OLX Chat").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /OLX/i }));
    expect(
      screen.getByRole("heading", { name: "Capacidades do OLX Chat" }),
    ).toBeVisible();
    expect(screen.getByText("Mensagens de texto")).toBeVisible();
    expect(screen.getByText("Somente pelo comprador")).toBeVisible();
    expect(screen.queryByLabelText(/ID da instância/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/webhook/i)).not.toBeInTheDocument();
  });
});

function createConnection(
  provider: CrmWhatsappProvider,
  status: "connected" | "disconnected",
  configured: boolean,
): CrmWhatsappProviderConnection {
  return {
    channel:
      provider === "olx_chat"
        ? "olx_chat"
        : provider === "composio_instagram"
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
    displayName: provider === "olx_chat" ? "OLX" : "CRM channel",
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
    availableProviders: ["composio_whatsapp" as const],
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
