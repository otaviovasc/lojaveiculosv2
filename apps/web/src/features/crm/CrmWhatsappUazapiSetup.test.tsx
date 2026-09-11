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
import { AppApiError } from "../../lib/apiErrors";
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

  it("requests a pairing code with the normalized Brazilian phone", async () => {
    const handlers = createHandlers();
    handlers.onRequestUazapiPairingCode = vi.fn(async () => ({
      code: "ABCD-1234",
      expiresAt: "2099-01-01T00:05:00.000Z",
      requested: true,
    }));

    render(
      <CrmWhatsappUazapiSetup
        canPair
        canSetup
        connection={createPairingConnection()}
        handlers={handlers}
        onBack={vi.fn()}
        onConnection={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Código do telefone" }));
    fireEvent.change(screen.getByLabelText("Telefone para pareamento"), {
      target: { value: "11999998888" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Solicitar código" }));

    await waitFor(() =>
      expect(handlers.onRequestUazapiPairingCode).toHaveBeenCalledWith(
        "connection-uazapi",
        "5511999998888",
      ),
    );
    expect(await screen.findByText("ABCD-1234")).toBeVisible();
  });

  it.each(["1199999", "551199999"])(
    "rejects the incomplete phone %s without calling the provider route",
    async (phone) => {
      const handlers = createHandlers();
      handlers.onRequestUazapiPairingCode = vi.fn();

      render(
        <CrmWhatsappUazapiSetup
          canPair
          canSetup
          connection={createPairingConnection()}
          handlers={handlers}
          onBack={vi.fn()}
          onConnection={vi.fn()}
        />,
      );

      fireEvent.click(screen.getByRole("tab", { name: "Código do telefone" }));
      fireEvent.change(screen.getByLabelText("Telefone para pareamento"), {
        target: { value: phone },
      });
      fireEvent.click(screen.getByRole("button", { name: "Solicitar código" }));

      expect(
        await screen.findByText(/Informe o telefone completo com DDD/i),
      ).toBeVisible();
      expect(handlers.onRequestUazapiPairingCode).not.toHaveBeenCalled();
    },
  );

  it("offers credential repair in repair mode when the provider status is an error", async () => {
    const handlers = createHandlers();
    handlers.onRepairUazapiCredentials = vi.fn(async () =>
      createPairingConnection(),
    );
    handlers.onRefreshUazapiStatus = vi.fn(async () =>
      createPairingConnection(),
    );
    const onConnection = vi.fn();

    render(
      <CrmWhatsappUazapiSetup
        canPair
        canRepairCredentials
        canSetup
        connection={createErrorConnection()}
        handlers={handlers}
        onBack={vi.fn()}
        onConnection={onConnection}
      />,
    );

    expect(screen.getByText("Etapa 3 de 4 · Pareamento")).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Atualizar credenciais da instância",
      }),
    );
    fireEvent.change(screen.getByLabelText("ID da instância"), {
      target: { value: " instance-1 " },
    });
    fireEvent.change(screen.getByLabelText("Token da instância"), {
      target: { value: " new-token " },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar novas credenciais" }),
    );

    await waitFor(() =>
      expect(handlers.onRepairUazapiCredentials).toHaveBeenCalledWith(
        "connection-uazapi",
        { instanceId: "instance-1", instanceToken: "new-token" },
      ),
    );
    await waitFor(() =>
      expect(handlers.onRefreshUazapiStatus).toHaveBeenCalledWith(
        "connection-uazapi",
      ),
    );
    expect(onConnection).toHaveBeenCalled();
  });

  it("offers instance replacement when repair reports an identity mismatch", async () => {
    const handlers = createHandlers();
    handlers.onRepairUazapiCredentials = vi.fn(async () => {
      throw new AppApiError({
        code: "CRM_UAZAPI_IDENTITY_REPLACEMENT_REQUIRES_SUPPORT",
        message: "identity mismatch",
        status: 409,
      });
    });
    handlers.onReplaceUazapiConnection = vi.fn(async () => ({
      connection: createPairingConnection(),
      operationId: "op-1",
      status: "completed" as const,
    }));
    handlers.onRefreshUazapiStatus = vi.fn(async () =>
      createPairingConnection(),
    );

    render(
      <CrmWhatsappUazapiSetup
        canPair
        canRepairCredentials
        canSetup
        connection={createErrorConnection()}
        handlers={handlers}
        onBack={vi.fn()}
        onConnection={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Atualizar credenciais da instância",
      }),
    );
    fireEvent.change(screen.getByLabelText("ID da instância"), {
      target: { value: "instance-2" },
    });
    fireEvent.change(screen.getByLabelText("Token da instância"), {
      target: { value: "new-token" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar novas credenciais" }),
    );

    const replaceButton = await screen.findByRole("button", {
      name: "Trocar para a nova instância",
    });
    expect(replaceButton).toBeVisible();
    fireEvent.click(replaceButton);

    await waitFor(() =>
      expect(handlers.onReplaceUazapiConnection).toHaveBeenCalled(),
    );
    const replaceCall = vi.mocked(handlers.onReplaceUazapiConnection).mock
      .calls[0];
    expect(replaceCall?.[0]).toBe("connection-uazapi");
    expect(replaceCall?.[1]).toMatchObject({
      expectedRevision: 0,
      instanceId: "instance-2",
      instanceToken: "new-token",
    });
    expect(replaceCall?.[1].idempotencyKey).toEqual(expect.any(String));
    await waitFor(() =>
      expect(handlers.onRefreshUazapiStatus).toHaveBeenCalledWith(
        "connection-uazapi",
      ),
    );
  });

  it("offers starting a fresh connection from the repair state", () => {
    const handlers = createHandlers();
    handlers.onRepairUazapiCredentials = vi.fn();
    const onStartFreshSetup = vi.fn();

    render(
      <CrmWhatsappUazapiSetup
        canPair
        canRepairCredentials
        canSetup
        connection={createErrorConnection()}
        handlers={handlers}
        onBack={vi.fn()}
        onConnection={vi.fn()}
        onStartFreshSetup={onStartFreshSetup}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Criar nova conexão" }));
    expect(onStartFreshSetup).toHaveBeenCalledTimes(1);
  });

  it("explains honestly when the connection limit blocks a fresh setup", () => {
    const handlers = createHandlers();
    handlers.onRepairUazapiCredentials = vi.fn();

    render(
      <CrmWhatsappUazapiSetup
        canPair
        canRepairCredentials
        canSetup
        connection={createErrorConnection()}
        freshSetupBlockedReason="Limite de conexões WhatsApp desta loja atingido (3 de 3). Arquive uma conexão existente antes de criar outra; nenhuma nova conexão foi criada."
        handlers={handlers}
        onBack={vi.fn()}
        onConnection={vi.fn()}
        onStartFreshSetup={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Criar nova conexão" }),
    ).toBeNull();
    expect(screen.getByRole("note")).toHaveTextContent(
      /Limite de conexões WhatsApp desta loja atingido/,
    );
  });

  it("replaces the instance with an account instance via the admin token", async () => {
    const handlers = createHandlers();
    handlers.onRepairUazapiCredentials = vi.fn();
    handlers.onListUazapiInstances = vi.fn(async () => [
      {
        connectedPhone: null,
        id: "instance-2",
        name: "Instância B",
        status: "disconnected",
      },
    ]);
    handlers.onReplaceUazapiConnection = vi.fn(async () => ({
      connection: createPairingConnection(),
      operationId: "op-admin-1",
      status: "completed" as const,
    }));
    handlers.onRefreshUazapiStatus = vi.fn(async () =>
      createPairingConnection(),
    );

    render(
      <CrmWhatsappUazapiSetup
        canPair
        canRepairCredentials
        canSetup
        connection={createErrorConnection()}
        handlers={handlers}
        onBack={vi.fn()}
        onConnection={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Atualizar credenciais da instância",
      }),
    );
    fireEvent.click(
      screen.getByRole("radio", { name: "Usar token admin da conta" }),
    );
    fireEvent.change(screen.getByLabelText("Token admin da conta"), {
      target: { value: " admin-token-1 " },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Buscar instâncias da conta" }),
    );

    await waitFor(() =>
      expect(handlers.onListUazapiInstances).toHaveBeenCalledWith({
        adminToken: "admin-token-1",
      }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Instância uazapi existente" }),
    );
    fireEvent.click(await screen.findByRole("option", { name: /Instância B/ }));
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar troca de instância" }),
    );

    await waitFor(() =>
      expect(handlers.onReplaceUazapiConnection).toHaveBeenCalledWith(
        "connection-uazapi",
        {
          adminToken: "admin-token-1",
          expectedRevision: 0,
          idempotencyKey: expect.any(String),
          instanceId: "instance-2",
        },
      ),
    );
    expect(handlers.onRepairUazapiCredentials).not.toHaveBeenCalled();
  });

  it("creates a fresh provider instance from the admin token path", async () => {
    const handlers = createHandlers();
    handlers.onRepairUazapiCredentials = vi.fn();
    handlers.onListUazapiInstances = vi.fn(async () => []);
    handlers.onReplaceUazapiConnection = vi.fn(async () => ({
      connection: createPairingConnection(),
      operationId: "op-admin-2",
      status: "completed" as const,
    }));
    handlers.onRefreshUazapiStatus = vi.fn(async () =>
      createPairingConnection(),
    );

    render(
      <CrmWhatsappUazapiSetup
        canPair
        canRepairCredentials
        canSetup
        connection={createErrorConnection()}
        handlers={handlers}
        onBack={vi.fn()}
        onConnection={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Atualizar credenciais da instância",
      }),
    );
    fireEvent.click(
      screen.getByRole("radio", { name: "Usar token admin da conta" }),
    );
    fireEvent.change(screen.getByLabelText("Token admin da conta"), {
      target: { value: "admin-token-1" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Buscar instâncias da conta" }),
    );

    expect(
      await screen.findByText(/Nenhuma instância foi encontrada/),
    ).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar troca de instância" }),
    );

    await waitFor(() =>
      expect(handlers.onReplaceUazapiConnection).toHaveBeenCalledWith(
        "connection-uazapi",
        {
          adminToken: "admin-token-1",
          createInstance: {},
          expectedRevision: 0,
          idempotencyKey: expect.any(String),
        },
      ),
    );
  });

  it("reveals credential repair after a status refresh fails with provider auth", async () => {
    const handlers = createHandlers();
    handlers.onRepairUazapiCredentials = vi.fn();
    handlers.onRefreshUazapiStatus = vi.fn(async () => {
      throw new AppApiError({
        code: "CRM_MESSAGING_PROVIDER_AUTH_FAILED",
        message: "UAZAPI status failed with HTTP 401",
        status: 401,
      });
    });

    render(
      <CrmWhatsappUazapiSetup
        canPair
        canRepairCredentials
        canSetup
        connection={createPairingConnection()}
        handlers={handlers}
        onBack={vi.fn()}
        onConnection={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", {
        name: "Atualizar credenciais da instância",
      }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Verificar agora" }));

    expect(
      await screen.findByText(
        /credenciais da instância UAZAPI não são mais válidas/i,
      ),
    ).toBeVisible();
    expect(
      await screen.findByRole("button", {
        name: "Atualizar credenciais da instância",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Verificar agora" }),
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

function createPairingConnection(): CrmProviderConnection {
  return createConnection({
    live: {
      checkedAt: "2026-08-25T12:00:00.000Z",
      connected: false,
      connectedPhone: null,
      providerStatus: "disconnected",
      smartphoneConnected: false,
    },
    phoneNumber: null,
    ready: false,
    readiness: {
      ready: false,
      reason: "disconnected",
      reasonCode: "disconnected",
    },
  });
}

function createErrorConnection(): CrmProviderConnection {
  const connection = createPairingConnection();
  return {
    ...connection,
    live: {
      checkedAt: "2026-08-25T12:00:00.000Z",
      connected: null,
      connectedPhone: null,
      errorMessage: "UAZAPI status failed with HTTP 401",
      providerStatus: "error",
      smartphoneConnected: null,
    },
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
