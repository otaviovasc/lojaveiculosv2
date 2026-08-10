// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("resumes the pending official connection after the OAuth return", async () => {
    const official = createOfficialConnection("composio_whatsapp", false);
    window.sessionStorage.setItem(
      "crm.whatsapp.composio.pendingConnectionId",
      String(official.id),
    );
    const onCompleteComposio = vi.fn(async () => ({
      connection: official,
      nextAction: null,
      senders: [],
    }));

    render(
      <CrmWhatsappConnectionAdmin
        connections={[createDisconnectedConnection(), official]}
        onConfigureWebhooks={vi.fn(async () => null)}
        onRefresh={vi.fn(async () => undefined)}
        onUpdate={vi.fn(async () => true)}
        selfService={{
          allowance: { limit: 2, remaining: 0, used: 2 },
          availableProviders: [],
          canManage: true,
          handlers: {
            onAuthorizeComposio: vi.fn(),
            onCompleteComposio,
            onCreate: vi.fn(),
            onRefreshConnections: vi.fn(async () => undefined),
            onSelectComposioSender: vi.fn(),
          },
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "WhatsApp Oficial" }),
    ).toBeVisible();
    await waitFor(() =>
      expect(onCompleteComposio).toHaveBeenCalledWith(String(official.id)),
    );
  });

  it("keeps provider credentials out of the dealership interface", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn(async () => true);
    const onConfigureWebhooks = vi.fn(async () => webhookConfigResult());
    render(
      <CrmWhatsappConnectionAdmin
        connections={[createConnectedConnection()]}
        onConfigureWebhooks={onConfigureWebhooks}
        onRefresh={vi.fn(async () => undefined)}
        onUpdate={onUpdate}
      />,
    );

    expect(screen.getByText("Online")).toBeVisible();
    expect(screen.getByText("Z-API")).toBeVisible();
    expect(screen.queryByLabelText(/ID da instância/i)).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/Token da instância/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("old-secret")).not.toBeInTheDocument();
    await user.click(screen.getByText("Configuração automática"));
    await user.click(
      screen.getByRole("button", { name: "Configurar automaticamente" }),
    );
    await waitFor(() =>
      expect(onConfigureWebhooks).toHaveBeenCalledWith("connection_1"),
    );
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it("reports automatic configuration success without exposing endpoint URLs", async () => {
    const user = userEvent.setup();
    const onConfigureWebhooks = vi.fn(async () => webhookConfigResult());
    render(
      <CrmWhatsappConnectionAdmin
        connections={[
          createDisconnectedConnection({ credentialsConfigured: true }),
        ]}
        onConfigureWebhooks={onConfigureWebhooks}
        onRefresh={vi.fn(async () => undefined)}
        onUpdate={vi.fn(async () => true)}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Configurar automaticamente" }),
    );

    await waitFor(() =>
      expect(onConfigureWebhooks).toHaveBeenCalledWith("connection_1"),
    );
    expect(
      await screen.findByText(/preparada automaticamente para receber/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByDisplayValue(/webhooks\/received/i),
    ).not.toBeInTheDocument();
  });

  it("offers retry and support when automatic setup cannot finish", async () => {
    const user = userEvent.setup();
    render(
      <CrmWhatsappConnectionAdmin
        connections={[createDisconnectedConnection()]}
        onConfigureWebhooks={vi.fn(async () => {
          throw new Error("provider secret should stay hidden");
        })}
        onRefresh={vi.fn(async () => undefined)}
        onUpdate={vi.fn(async () => true)}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Configuração da Z-API" }),
    ).toBeVisible();
    expect(screen.getByText(/nossa equipe prepara o canal/i)).toBeVisible();
    expect(screen.queryByLabelText(/token/i)).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Configurar automaticamente" }),
    );
    const support = await screen.findByRole("link", {
      name: "Falar com o suporte",
    });
    expect(support).toHaveAttribute(
      "href",
      expect.stringContaining("5511940231407"),
    );
    expect(decodeURIComponent(support.getAttribute("href") ?? "")).toContain(
      "ZAPI-SUPPORT1",
    );
    expect(screen.queryByText(/provider secret/i)).not.toBeInTheDocument();
  });

  it.each([
    ["composio_whatsapp", "WhatsApp oficial", false],
    ["composio_instagram", "Instagram", true],
  ] as const)(
    "shows %s as provider-managed without Z-API configuration controls",
    (provider, providerLabel, connected) => {
      const onConfigureWebhooks = vi.fn(async () => webhookConfigResult());
      const onUpdate = vi.fn(async () => true);
      render(
        <CrmWhatsappConnectionAdmin
          connections={[createOfficialConnection(provider, connected)]}
          onConfigureWebhooks={onConfigureWebhooks}
          onRefresh={vi.fn(async () => undefined)}
          onUpdate={onUpdate}
        />,
      );

      expect(screen.getByText(providerLabel)).toBeVisible();
      expect(
        screen.getByRole("heading", {
          name: `${providerLabel} conectado`,
        }),
      ).toBeVisible();
      expect(
        screen.queryByLabelText("ID da instancia"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", {
          name: /Configurar automaticamente/i,
        }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /Salvar instancia/i }),
      ).not.toBeInTheDocument();
      expect(onConfigureWebhooks).not.toHaveBeenCalled();
      expect(onUpdate).not.toHaveBeenCalled();
    },
  );
});

function createConnectedConnection(): CrmWhatsappProviderConnection {
  return {
    credentials: credentials(true),
    displayName: "ZAPI Test Connection",
    externalConnectionId: null,
    externalInstanceId: "zapi-old",
    id: "connection_1",
    live: {
      checkedAt: "2026-07-06T12:00:00.000Z",
      connected: true,
      connectedPhone: "5511940231407",
      providerStatus: "connected",
      smartphoneConnected: true,
    },
    metadata: emptyMetadata,
    phone: "5511940231407",
    provider: "zapi",
    ready: true,
    setup: setupState(),
    status: "active",
    webhookEndpoints: [webhookEndpoint],
    webhookTokenRequired: false,
    webhookUrl: null,
  };
}

function createDisconnectedConnection({
  credentialsConfigured = false,
}: {
  credentialsConfigured?: boolean;
} = {}): CrmWhatsappProviderConnection {
  return {
    ...createConnectedConnection(),
    credentials: credentials(credentialsConfigured),
    externalInstanceId: credentialsConfigured ? "zapi-old" : null,
    live: {
      checkedAt: "2026-07-06T12:00:00.000Z",
      connected: false,
      connectedPhone: null,
      providerStatus: "disconnected",
      smartphoneConnected: false,
    },
    status: "disconnected",
  };
}

function createOfficialConnection(
  provider: Exclude<CrmWhatsappProvider, "zapi">,
  connected: boolean,
): CrmWhatsappProviderConnection {
  return {
    ...createConnectedConnection(),
    credentials: {
      ...credentials(false),
      apiKeyEnv: "COMPOSIO_API_KEY",
      composioConnectedAccountConfigured: true,
      mode: "composio",
    },
    displayName:
      provider === "composio_instagram"
        ? "Instagram oficial"
        : "WhatsApp oficial",
    externalConnectionId:
      provider === "composio_instagram"
        ? "instagram-business-account"
        : "whatsapp-phone-number",
    externalInstanceId: null,
    id: `connection_${provider}`,
    live: connected
      ? {
          checkedAt: "2026-07-27T12:00:00.000Z",
          connected: true,
          connectedPhone:
            provider === "composio_whatsapp" ? "5511940231407" : null,
          providerStatus: "connected",
          smartphoneConnected: null,
        }
      : {
          checkedAt: "2026-07-27T12:00:00.000Z",
          connected: false,
          connectedPhone: null,
          providerStatus: "disconnected",
          smartphoneConnected: null,
        },
    phone: provider === "composio_whatsapp" ? "5511940231407" : null,
    provider,
    status: connected ? "active" : "disconnected",
    webhookEndpoints: [],
    webhookTokenRequired: true,
  };
}

function credentials(storedInstanceConfigured: boolean) {
  return {
    apiBaseUrlEnv: null,
    clientTokenEnv: null,
    instanceIdEnv: null,
    instanceTokenEnv: null,
    mode: "stored",
    storedInstanceConfigured,
  };
}

function webhookConfigResult() {
  return {
    connectionId: "connection_1",
    results: [
      {
        error: null,
        ok: true,
        status: 200,
        type: "received",
        url: "https://api.example.test/webhooks/received?token=secret",
      },
    ],
    setup: setupState(),
    tokenApplied: true,
  };
}

const webhookEndpoint = {
  label: "Mensagens recebidas",
  type: "received" as const,
  url: "https://api.example.test/webhooks/received",
};

const emptyMetadata = {
  catalogPhone: null,
  connectedPhone: null,
  migrationUnit: null,
  purpose: null,
};

function setupState() {
  return {
    attemptCount: 1,
    configuredAt: "2026-08-10T12:00:00.000Z",
    lastErrorCode: null,
    requestedAt: "2026-08-10T12:00:00.000Z",
    requiredTypes: ["received"],
    status: "configured" as const,
    succeededTypes: ["received"],
    supportCode: "ZAPI-SUPPORT1",
    updatedAt: "2026-08-10T12:00:00.000Z",
    version: 1 as const,
  };
}
