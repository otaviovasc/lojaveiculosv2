// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
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

  it("keeps configured Z-API credentials write-only", () => {
    render(
      <CrmWhatsappConnectionAdmin
        connections={[createConnection("zapi", "connected", true)]}
        onRefresh={vi.fn(async () => undefined)}
      />,
    );

    expect(screen.getByText("Z-API")).toBeVisible();
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

  it("shows pairing-only controls for an existing disconnected Z-API connection", () => {
    render(
      <CrmWhatsappConnectionAdmin
        connections={[createConnection("zapi", "disconnected", true)]}
        onRefresh={vi.fn(async () => undefined)}
        selfService={{
          allowance: { limit: 1, remaining: 0, used: 1 },
          availableProviders: [],
          canPair: true,
          canSetup: false,
          handlers: {
            onAuthorizeComposio: vi.fn(),
            onCompleteComposio: vi.fn(),
            onCreate: vi.fn(),
            onRefreshConnections: vi.fn(async () => undefined),
            onRequestZapiPairingCode: vi.fn(),
            onRequestZapiPairingQr: vi.fn(),
            onSelectComposioSender: vi.fn(),
          },
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Conectar WhatsApp · Z-API" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Gerar QR Code" })).toBeVisible();
    expect(screen.getByLabelText("Telefone para pareamento")).toBeVisible();
    expect(screen.queryByLabelText(/ID da instância/i)).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/Token da instância/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/Token do cliente/i),
    ).not.toBeInTheDocument();
  });

  it("keeps OLX Chat human-readable and exposes no provider setup controls", () => {
    render(
      <CrmWhatsappConnectionAdmin
        connections={[createConnection("olx_chat", "connected", true)]}
        onRefresh={vi.fn(async () => undefined)}
      />,
    );

    expect(screen.getByText("OLX Chat")).toBeVisible();
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
