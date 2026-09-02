// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CrmProviderConnection } from "./crmConversationTypes";
import { CrmWhatsappUazapiSetup } from "./CrmWhatsappUazapiSetup";
import { readUazapiSetupStep } from "./CrmWhatsappUazapiSetupParts";
import type { CrmConnectionSelfServiceHandlers } from "./CrmConnectionSelfServiceSetup";

describe("readUazapiSetupStep", () => {
  it("starts at provisioning without a connection and never asks credentials", () => {
    expect(readUazapiSetupStep({ connection: null })).toBe(1);
    expect(
      readUazapiSetupStep({
        connection: createConnection({
          readiness: {
            ready: false,
            reason: "credentials_incomplete",
            reasonCode: "not_authorized",
          },
        }),
      }),
    ).not.toBe(1);
  });

  it("keeps webhook setup as an explicit pending step", () => {
    expect(
      readUazapiSetupStep({
        connection: createConnection({
          readiness: {
            ready: false,
            reason: "pending_webhook",
            reasonCode: "pending_webhook",
          },
          setup: createSetup({ status: "configuring" }),
        }),
      }),
    ).toBe(2);
  });

  it("treats a disconnected provider as pairing, never as ready", () => {
    expect(
      readUazapiSetupStep({
        connection: createConnection({
          live: {
            checkedAt: "2026-08-25T12:00:00.000Z",
            connected: false,
            connectedPhone: null,
            providerStatus: "disconnected",
            smartphoneConnected: false,
          },
          ready: false,
          readiness: {
            ready: false,
            reason: "disconnected",
            reasonCode: "disconnected",
          },
        }),
      }),
    ).toBe(3);
  });

  it("reaches ready only when server readiness is confirmed", () => {
    expect(readUazapiSetupStep({ connection: createConnection() })).toBe(4);
  });
});

describe("CrmWhatsappUazapiSetup", () => {
  afterEach(cleanup);

  it("validates the admin token and provisions a new instance", async () => {
    const handlers = createHandlers();
    const onConnection = vi.fn();

    render(
      <CrmWhatsappUazapiSetup
        canPair={false}
        canSetup
        connection={null}
        handlers={handlers}
        onBack={vi.fn()}
        onConnection={onConnection}
      />,
    );

    expect(screen.getByText("Etapa 1 de 4 · Provisionamento")).toBeVisible();
    expect(screen.queryByLabelText("ID da instância")).toBeNull();
    expect(screen.queryByLabelText("Client-Token")).toBeNull();
    expect(handlers.onCreate).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Token admin da uazapi"), {
      target: { value: " admin-token-123 " },
    });
    fireEvent.change(screen.getByLabelText("URL base da uazapi (opcional)"), {
      target: { value: "https://free.uazapi.com" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Validar e continuar" }),
    );

    await waitFor(() =>
      expect(handlers.onListUazapiInstances).toHaveBeenCalledWith({
        adminToken: "admin-token-123",
        baseUrl: "https://free.uazapi.com",
      }),
    );
    expect(
      await screen.findByText(/Nenhuma instância foi encontrada/i),
    ).toBeVisible();
    expect(handlers.onCreate).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Nome da conexão"), {
      target: { value: " WhatsApp matriz " },
    });
    fireEvent.change(
      screen.getByLabelText("Telefone para pareamento (opcional)"),
      {
        target: { value: "+55 (11) 99999-9999" },
      },
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Criar e provisionar conexão" }),
    );

    await waitFor(() =>
      expect(handlers.onCreate).toHaveBeenCalledWith({
        adminToken: "admin-token-123",
        baseUrl: "https://free.uazapi.com",
        channel: "whatsapp",
        connectionPhoneNumber: "5511999999999",
        displayName: "WhatsApp matriz",
        mode: "create",
        provider: "uazapi",
      }),
    );
    expect(onConnection).toHaveBeenCalled();
  });

  it("attaches an existing instance selected from the validated account", async () => {
    const handlers = createHandlers();
    handlers.onListUazapiInstances = vi.fn(async () => [
      {
        connectedPhone: null,
        id: "inst-a",
        name: "Instância A",
        status: "disconnected",
      },
      {
        connectedPhone: "5511988887777",
        id: "inst-b",
        name: "Instância B",
        status: "connected",
      },
    ]);

    render(
      <CrmWhatsappUazapiSetup
        canPair={false}
        canSetup
        connection={null}
        handlers={handlers}
        onBack={vi.fn()}
        onConnection={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Token admin da uazapi"), {
      target: { value: "admin-token-123" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Validar e continuar" }),
    );

    await screen.findByRole("radio", { name: "Usar instância existente" });
    fireEvent.click(
      screen.getByRole("radio", { name: "Usar instância existente" }),
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Instância uazapi existente" }),
    );
    const listbox = await screen.findByRole("listbox", {
      name: "Instância uazapi existente: opções",
    });
    expect(
      screen.getByRole("option", {
        name: /Instância B · conectada · 5511988887777/,
      }),
    ).toBeInTheDocument();
    fireEvent.click(
      within(listbox).getByRole("option", {
        name: /Instância A · desconectada/,
      }),
    );

    fireEvent.change(screen.getByLabelText("Nome da conexão"), {
      target: { value: "WhatsApp matriz" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Conectar instância selecionada" }),
    );

    await waitFor(() =>
      expect(handlers.onCreate).toHaveBeenCalledWith({
        adminToken: "admin-token-123",
        channel: "whatsapp",
        displayName: "WhatsApp matriz",
        instanceId: "inst-a",
        mode: "attach",
        provider: "uazapi",
      }),
    );
  });

  it("surfaces an invalid admin token without advancing or provisioning", async () => {
    const handlers = createHandlers();
    handlers.onListUazapiInstances = vi.fn(async () => {
      throw new Error("token inválido");
    });

    render(
      <CrmWhatsappUazapiSetup
        canPair={false}
        canSetup
        connection={null}
        handlers={handlers}
        onBack={vi.fn()}
        onConnection={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Token admin da uazapi"), {
      target: { value: "token-errado" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Validar e continuar" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "token inválido",
    );
    expect(screen.queryByLabelText("Nome da conexão")).toBeNull();
    expect(handlers.onCreate).not.toHaveBeenCalled();
  });

  it("requires a display name before provisioning", async () => {
    const handlers = createHandlers();
    render(
      <CrmWhatsappUazapiSetup
        canPair={false}
        canSetup
        connection={null}
        handlers={handlers}
        onBack={vi.fn()}
        onConnection={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Token admin da uazapi"), {
      target: { value: "admin-token-123" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Validar e continuar" }),
    );
    await screen.findByText(/Nenhuma instância foi encontrada/i);

    fireEvent.click(
      screen.getByRole("button", { name: "Criar e provisionar conexão" }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Informe um nome para identificar esta conexão",
    );
    expect(handlers.onCreate).not.toHaveBeenCalled();
  });

  it("surfaces a failed provisioning without implying success", async () => {
    const handlers = createHandlers();
    handlers.onCreate = vi.fn(async () => {
      throw new Error("provider offline");
    });
    render(
      <CrmWhatsappUazapiSetup
        canPair={false}
        canSetup
        connection={null}
        handlers={handlers}
        onBack={vi.fn()}
        onConnection={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Token admin da uazapi"), {
      target: { value: "admin-token-123" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Validar e continuar" }),
    );
    await screen.findByText(/Nenhuma instância foi encontrada/i);

    fireEvent.change(screen.getByLabelText("Nome da conexão"), {
      target: { value: "WhatsApp matriz" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Criar e provisionar conexão" }),
    );

    expect(await screen.findByRole("alert")).toBeVisible();
    expect(handlers.onCreate).toHaveBeenCalledOnce();
    expect(screen.queryByText(/pronto para uso/i)).toBeNull();
  });

  it("renders webhook readiness as an explicit pending state", () => {
    render(
      <CrmWhatsappUazapiSetup
        canPair
        canSetup
        connection={createConnection({
          readiness: {
            ready: false,
            reason: "pending_webhook",
            reasonCode: "pending_webhook",
          },
          setup: createSetup({
            requiredTypes: ["received", "delivery"],
            status: "configuring",
            succeededTypes: ["received"],
          }),
        })}
        handlers={createHandlers()}
        onBack={vi.fn()}
        onConnection={vi.fn()}
      />,
    );

    expect(screen.getByText("Etapa 2 de 4 · Configuração")).toBeVisible();
    expect(screen.getByText(/1 de 2 webhooks confirmados/i)).toBeVisible();
    expect(screen.queryByText(/pronto para uso/i)).toBeNull();
  });

  it("requests a pairing QR only for the active connection", async () => {
    const handlers = createHandlers();
    handlers.onRequestUazapiPairingQr = vi.fn(async () => ({
      expiresAt: "2099-01-01T00:05:00.000Z",
      qrCode: "data:image/png;base64,qr",
    }));

    render(
      <CrmWhatsappUazapiSetup
        canPair
        canSetup
        connection={createConnection({
          live: {
            checkedAt: "2026-08-25T12:00:00.000Z",
            connected: false,
            connectedPhone: null,
            providerStatus: "disconnected",
            smartphoneConnected: false,
          },
          ready: false,
          readiness: {
            ready: false,
            reason: "disconnected",
            reasonCode: "disconnected",
          },
        })}
        handlers={handlers}
        onBack={vi.fn()}
        onConnection={vi.fn()}
      />,
    );

    expect(screen.getByText("Etapa 3 de 4 · Pareamento")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Gerar QR Code" }));

    await waitFor(() =>
      expect(handlers.onRequestUazapiPairingQr).toHaveBeenCalledWith(
        "connection-uazapi",
      ),
    );
    expect(
      await screen.findByAltText("QR Code para conectar o WhatsApp"),
    ).toBeVisible();
  });

  it("shows success only when server readiness is confirmed", () => {
    render(
      <CrmWhatsappUazapiSetup
        canPair
        canSetup
        connection={createConnection()}
        handlers={createHandlers()}
        onBack={vi.fn()}
        onConnection={vi.fn()}
      />,
    );

    expect(screen.getByText("Etapa 4 de 4 · Pronto")).toBeVisible();
    expect(screen.getByText(/conectado e pronto para uso/i)).toBeVisible();
  });
});

function createHandlers(): CrmConnectionSelfServiceHandlers {
  const connection = createConnection();
  return {
    onAuthorizeComposio: vi.fn(),
    onCompleteComposio: vi.fn(),
    onConfigureZapiWebhooks: vi.fn(),
    onCreate: vi.fn(async () => connection),
    onListUazapiInstances: vi.fn(async () => []),
    onRefreshConnections: vi.fn(async () => undefined),
    onSelectComposioSender: vi.fn(),
  };
}

function createSetup(overrides: Record<string, unknown> = {}) {
  return {
    attemptCount: 1,
    configuredAt: "2026-08-25T12:00:00.000Z",
    lastErrorCode: null,
    requestedAt: "2026-08-25T11:59:00.000Z",
    requiredTypes: ["received"],
    status: "configured" as const,
    succeededTypes: ["received"],
    supportCode: "UAZAPI-SETUP",
    updatedAt: "2026-08-25T12:00:00.000Z",
    version: 2 as const,
    ...overrides,
  };
}

function createConnection(
  overrides: Partial<CrmProviderConnection> = {},
): CrmProviderConnection {
  return {
    channel: "whatsapp",
    displayName: "WhatsApp da loja",
    id: "connection-uazapi",
    live: {
      checkedAt: "2026-08-25T12:00:00.000Z",
      connected: true,
      connectedPhone: "5511999999999",
      providerStatus: "connected",
      smartphoneConnected: true,
    },
    phoneNumber: "5511999999999",
    provider: "uazapi",
    readiness: { ready: true, reason: null, reasonCode: "ready" },
    ready: true,
    setup: createSetup(),
    state: "active",
    status: "active",
    ...overrides,
  };
}
