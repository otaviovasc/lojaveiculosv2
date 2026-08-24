// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { AppApiError } from "../../lib/apiErrors";
import { CrmWhatsappZapiSetup } from "./CrmWhatsappZapiSetup";
import type { CrmConnectionSelfServiceHandlers } from "./CrmConnectionSelfServiceSetup";
import type {
  CrmProviderConnection,
  CrmWhatsappZapiAddonContract,
  CrmWhatsappZapiSetupState,
} from "./crmConversationTypes";

describe("CrmWhatsappZapiSetup", () => {
  afterEach(cleanup);

  it("offers a truthful purchase action when the store is not entitled", async () => {
    const handlers = createHandlers();
    handlers.onRequestZapiAddon = vi.fn(async () =>
      createZapiContract("pending"),
    );

    render(
      <CrmWhatsappZapiSetup
        allowance={{ limit: 0, remaining: 0, used: 0 }}
        canPair={false}
        canSetup={true}
        connection={null}
        handlers={handlers}
        onBack={vi.fn()}
        onConnection={vi.fn()}
        zapiAddonContract={null}
      />,
    );

    expect(screen.getByText("Integração opcional paga")).toBeVisible();
    expect(screen.queryByLabelText("ID da instância")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Solicitar Z-API" }));

    await waitFor(() =>
      expect(handlers.onRequestZapiAddon).toHaveBeenCalledTimes(1),
    );
    expect(handlers.onCreate).not.toHaveBeenCalled();
  });

  it("accepts credentials once and reports the safe configured connection", async () => {
    const handlers = createHandlers();
    const created = createDisconnectedConnection();
    handlers.onCreate = vi.fn(async () => created);
    const onConnection = vi.fn();

    render(
      <CrmWhatsappZapiSetup
        allowance={{ limit: 1, remaining: 1, used: 0 }}
        canPair={false}
        canSetup={true}
        connection={null}
        handlers={handlers}
        onBack={vi.fn()}
        onConnection={onConnection}
        zapiAddonContract={createZapiContract("active")}
      />,
    );

    fireEvent.change(screen.getByLabelText("ID da instância"), {
      target: { value: "instance-1" },
    });
    fireEvent.change(screen.getByLabelText("Token da instância"), {
      target: { value: "instance-token" },
    });
    expect(screen.queryByLabelText("Token do cliente")).not.toBeInTheDocument();
    expect(screen.getByText(/Client-Token da plataforma/i)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Salvar credenciais" }));

    await waitFor(() =>
      expect(handlers.onCreate).toHaveBeenCalledWith({
        channel: "whatsapp",
        instanceId: "instance-1",
        instanceToken: "instance-token",
        provider: "zapi",
      }),
    );
    expect(onConnection).toHaveBeenCalledWith(created);
    expect(screen.getByLabelText("ID da instância")).toHaveValue("");
  });

  it("recovers a duplicate create into the existing connection repair flow", async () => {
    const handlers = createHandlers();
    const existing = createDisconnectedConnection("existing-connection");
    handlers.onCreate = vi.fn(async () => {
      throw new AppApiError({
        code: "CRM_WHATSAPP_CONNECTION_PROVIDER_ALREADY_EXISTS",
        details: { provider: "zapi" },
        message: "Provider connection already exists.",
        status: 409,
      });
    });
    handlers.onRefreshConnectionsWithPayload = vi.fn(async () => [existing]);
    handlers.onRepairZapiCredentials = vi.fn(async () => existing);

    function Harness() {
      const [connection, setConnection] =
        useState<CrmProviderConnection | null>(null);
      return (
        <CrmWhatsappZapiSetup
          allowance={{ limit: 1, remaining: 0, used: 1 }}
          canPair={false}
          canRepairCredentials
          canSetup
          connection={connection}
          handlers={handlers}
          onBack={vi.fn()}
          onConnection={setConnection}
          zapiAddonContract={createZapiContract("active")}
        />
      );
    }

    render(<Harness />);

    fireEvent.change(screen.getByLabelText("ID da instância"), {
      target: { value: "instance-1" },
    });
    fireEvent.change(screen.getByLabelText("Token da instância"), {
      target: { value: "instance-token" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar credenciais" }));

    expect(
      await screen.findByRole("heading", {
        name: "Atualizar credenciais da Z-API",
      }),
    ).toBeVisible();
    expect(handlers.onRefreshConnectionsWithPayload).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText("Reparo seguro da conexão existente"),
    ).toBeVisible();
    expect(
      screen.queryByText("Já existe uma conexão Z-API"),
    ).not.toBeInTheDocument();
  });

  it("reports when a canonical conflict cannot be reconciled", async () => {
    const handlers = createHandlers();
    handlers.onCreate = vi.fn(async () => {
      throw new AppApiError({
        code: "CRM_ZAPI_CONNECTION_REPAIR_REQUIRED",
        details: {
          connectionId: "missing-connection",
          expectedRevision: 1,
          identityRelation: "same_instance",
          nextAction: "repair_credentials",
        },
        message: "Existing Z-API connection requires repair.",
        status: 409,
      });
    });
    handlers.onRefreshConnectionsWithPayload = vi.fn(async () => []);

    render(
      <CrmWhatsappZapiSetup
        allowance={{ limit: 1, remaining: 0, used: 1 }}
        canPair={false}
        canRepairCredentials
        canSetup
        connection={null}
        handlers={handlers}
        onBack={vi.fn()}
        onConnection={vi.fn()}
        zapiAddonContract={createZapiContract("active")}
      />,
    );

    await saveZapiCredentials();

    expect(
      await screen.findByText(
        "A conexão Z-API foi encontrada, mas ainda não apareceu na lista. Atualize as conexões e tente novamente.",
      ),
    ).toBeVisible();
  });

  it("reports a recovery error when refreshing connections fails", async () => {
    const handlers = createHandlers();
    handlers.onCreate = vi.fn(async () => {
      throw new AppApiError({
        code: "CRM_WHATSAPP_CONNECTION_PROVIDER_ALREADY_EXISTS",
        details: { provider: "zapi" },
        message: "Provider connection already exists.",
        status: 409,
      });
    });
    handlers.onRefreshConnectionsWithPayload = vi.fn(async () => {
      throw new Error("network unavailable");
    });

    render(
      <CrmWhatsappZapiSetup
        allowance={{ limit: 1, remaining: 0, used: 1 }}
        canPair={false}
        canRepairCredentials
        canSetup
        connection={null}
        handlers={handlers}
        onBack={vi.fn()}
        onConnection={vi.fn()}
        zapiAddonContract={createZapiContract("active")}
      />,
    );

    await saveZapiCredentials();

    expect(
      await screen.findByText(
        "A conexão Z-API já existe, mas não foi possível atualizar a lista de conexões. Tente novamente.",
      ),
    ).toBeVisible();
  });

  it("does not route a non-Z-API provider conflict into Z-API repair", async () => {
    const handlers = createHandlers();
    handlers.onCreate = vi.fn(async () => {
      throw new AppApiError({
        code: "CRM_WHATSAPP_CONNECTION_PROVIDER_ALREADY_EXISTS",
        details: { provider: "meta_cloud" },
        message: "Official provider connection already exists.",
        status: 409,
      });
    });
    handlers.onRefreshConnectionsWithPayload = vi.fn(async () => [
      createDisconnectedConnection("existing-zapi"),
    ]);

    render(
      <CrmWhatsappZapiSetup
        allowance={{ limit: 1, remaining: 0, used: 1 }}
        canPair={false}
        canRepairCredentials
        canSetup
        connection={null}
        handlers={handlers}
        onBack={vi.fn()}
        onConnection={vi.fn()}
        zapiAddonContract={createZapiContract("active")}
      />,
    );

    await saveZapiCredentials();

    expect(
      await screen.findByText(
        "Já existe uma conexão oficial para esta loja. Abra a conexão existente para revisar ou reautorizar o canal.",
      ),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Atualizar credenciais da Z-API" }),
    ).not.toBeInTheDocument();
    expect(handlers.onRefreshConnectionsWithPayload).not.toHaveBeenCalled();
  });

  it("keeps the administrator guidance after selecting an existing connection", async () => {
    const handlers = createHandlers();
    const existing = createDisconnectedConnection("existing-connection");
    handlers.onCreate = vi.fn(async () => {
      throw new AppApiError({
        code: "CRM_ZAPI_CONNECTION_REPAIR_REQUIRED",
        details: {
          connectionId: existing.id,
          expectedRevision: 1,
          identityRelation: "same_instance",
          nextAction: "repair_credentials",
        },
        message: "Existing Z-API connection requires repair.",
        status: 409,
      });
    });
    handlers.onRefreshConnectionsWithPayload = vi.fn(async () => [existing]);

    function Harness() {
      const [connection, setConnection] =
        useState<CrmProviderConnection | null>(null);
      return (
        <CrmWhatsappZapiSetup
          allowance={{ limit: 1, remaining: 0, used: 1 }}
          canPair={false}
          canRepairCredentials={false}
          canSetup
          connection={connection}
          handlers={handlers}
          onBack={vi.fn()}
          onConnection={setConnection}
          zapiAddonContract={createZapiContract("active")}
        />
      );
    }

    render(<Harness />);
    await saveZapiCredentials();

    expect(
      await screen.findByText(
        "A conexão foi encontrada. Um administrador da loja precisa concluir esta operação.",
      ),
    ).toBeVisible();
  });

  it("lets an authorized user enter credentials when the add-on is paid and awaiting setup", async () => {
    const handlers = createHandlers();
    const created = createDisconnectedConnection();
    handlers.onCreate = vi.fn(async () => created);
    const onConnection = vi.fn();

    render(
      <CrmWhatsappZapiSetup
        allowance={{ limit: 0, remaining: 0, used: 0 }}
        canPair={false}
        canSetup={true}
        connection={null}
        handlers={handlers}
        onBack={vi.fn()}
        onConnection={onConnection}
        zapiAddonContract={createZapiContract("paid_awaiting_setup")}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Solicitar Z-API" }),
    ).toBeNull();
    fireEvent.change(screen.getByLabelText("ID da instância"), {
      target: { value: "instance-1" },
    });
    fireEvent.change(screen.getByLabelText("Token da instância"), {
      target: { value: "instance-token" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar credenciais" }));

    await waitFor(() => expect(onConnection).toHaveBeenCalledWith(created));
  });

  it("loads a QR pairing payload for a configured connection without exposing credentials", async () => {
    const handlers = createHandlers();
    handlers.onRequestZapiPairingQr = vi.fn(async () => ({
      expiresAt: "2099-08-10T12:00:00.000Z",
      qrCode: "data:image/png;base64,qr-payload",
    }));

    render(
      <CrmWhatsappZapiSetup
        allowance={{ limit: 1, remaining: 0, used: 1 }}
        canPair={true}
        canSetup={false}
        connection={createDisconnectedConnection()}
        handlers={handlers}
        onBack={vi.fn()}
        onConnection={vi.fn()}
        zapiAddonContract={createZapiContract("active")}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Gerar QR Code" }));

    expect(
      await screen.findByAltText("QR Code para conectar o WhatsApp"),
    ).toHaveAttribute("src", "data:image/png;base64,qr-payload");
    expect(handlers.onRequestZapiPairingQr).toHaveBeenCalledWith(
      "connection_1",
    );
    expect(screen.queryByLabelText(/token/i)).not.toBeInTheDocument();
  });

  it("shows an explicit pending state while requesting a QR code", async () => {
    const handlers = createHandlers();
    let resolveQr!: (value: { expiresAt: string; qrCode: string }) => void;
    handlers.onRequestZapiPairingQr = vi.fn(
      () =>
        new Promise<{ expiresAt: string; qrCode: string }>((resolve) => {
          resolveQr = resolve;
        }),
    );

    render(
      <CrmWhatsappZapiSetup
        allowance={{ limit: 1, remaining: 0, used: 1 }}
        canPair={true}
        canSetup={false}
        connection={createDisconnectedConnection()}
        handlers={handlers}
        onBack={vi.fn()}
        onConnection={vi.fn()}
        zapiAddonContract={createZapiContract("active")}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Gerar QR Code" }));

    expect(
      screen.getByRole("button", { name: "Gerando QR Code" }),
    ).toBeDisabled();

    resolveQr({
      expiresAt: "2099-08-10T12:00:00.000Z",
      qrCode: "data:image/png;base64,qr-payload",
    });
    expect(
      await screen.findByAltText("QR Code para conectar o WhatsApp"),
    ).toBeVisible();
  });

  it("automatically requests a replacement QR code after expiry", async () => {
    vi.useFakeTimers();
    const handlers = createHandlers();
    handlers.onRequestZapiPairingQr = vi
      .fn()
      .mockResolvedValueOnce({
        expiresAt: new Date(Date.now() + 1_000).toISOString(),
        qrCode: "data:image/png;base64,first-qr",
      })
      .mockResolvedValueOnce({
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        qrCode: "data:image/png;base64,replacement-qr",
      });

    try {
      render(
        <CrmWhatsappZapiSetup
          allowance={{ limit: 1, remaining: 0, used: 1 }}
          canPair={true}
          canSetup={false}
          connection={createDisconnectedConnection()}
          handlers={handlers}
          onBack={vi.fn()}
          onConnection={vi.fn()}
          zapiAddonContract={createZapiContract("active")}
        />,
      );

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Gerar QR Code" }));
        await Promise.resolve();
      });
      expect(
        screen.getByAltText("QR Code para conectar o WhatsApp"),
      ).toHaveAttribute("src", "data:image/png;base64,first-qr");

      await act(async () => {
        await vi.advanceTimersByTimeAsync(2_000);
      });

      expect(handlers.onRequestZapiPairingQr).toHaveBeenCalledTimes(2);
      expect(
        screen.getByAltText("QR Code para conectar o WhatsApp"),
      ).toHaveAttribute("src", "data:image/png;base64,replacement-qr");
    } finally {
      vi.useRealTimers();
    }
  });

  it("switches to phone pairing when Z-API requires Passkey", async () => {
    const handlers = createHandlers();
    handlers.onRequestZapiPairingQr = vi.fn(async () => {
      throw new AppApiError({
        code: "CRM_CONNECTION_SETUP_PAIRING_METHOD_REQUIRED",
        details: { nextAction: "request_phone_code" },
        message: "Provider requires another pairing method.",
        status: 409,
      });
    });

    render(
      <CrmWhatsappZapiSetup
        allowance={{ limit: 1, remaining: 0, used: 1 }}
        canPair={true}
        canSetup={false}
        connection={createDisconnectedConnection()}
        handlers={handlers}
        onBack={vi.fn()}
        onConnection={vi.fn()}
        zapiAddonContract={createZapiContract("active")}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Gerar QR Code" }));

    expect(
      await screen.findByLabelText("Telefone para pareamento"),
    ).toBeVisible();
    expect(
      screen.getByRole("tab", { name: "Código do telefone" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("alert")).toHaveTextContent(
      /exige uma verificação adicional/i,
    );
  });

  it("refreshes pairing status automatically while the modal is open", async () => {
    vi.useFakeTimers();
    const connection = createDisconnectedConnection();
    const handlers = createHandlers();
    handlers.onRefreshZapiStatus = vi.fn(async () => connection);

    function SetupHarness() {
      const [currentConnection, setCurrentConnection] = useState(connection);
      return (
        <CrmWhatsappZapiSetup
          allowance={{ limit: 1, remaining: 0, used: 1 }}
          canPair={true}
          canSetup={false}
          connection={currentConnection}
          handlers={handlers}
          onBack={vi.fn()}
          onConnection={setCurrentConnection}
          zapiAddonContract={createZapiContract("active")}
        />
      );
    }

    try {
      render(<SetupHarness />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5_000);
      });
      expect(handlers.onRefreshZapiStatus).toHaveBeenCalledWith("connection_1");
    } finally {
      vi.useRealTimers();
    }
  });

  it("continues reconciling status after the connection reaches ready", async () => {
    vi.useFakeTimers();
    const connected: CrmProviderConnection = {
      ...createDisconnectedConnection(),
      live: {
        checkedAt: "2099-08-12T12:00:00.000Z",
        connected: true,
        connectedPhone: "5511999999999",
        providerStatus: "connected",
        smartphoneConnected: true,
      },
      ready: true,
      status: "active",
    };
    const handlers = createHandlers();
    handlers.onRefreshZapiStatus = vi.fn(async () => connected);

    try {
      render(
        <CrmWhatsappZapiSetup
          allowance={{ limit: 1, remaining: 0, used: 1 }}
          canPair={true}
          canSetup={false}
          connection={connected}
          handlers={handlers}
          onBack={vi.fn()}
          onConnection={vi.fn()}
          zapiAddonContract={createZapiContract("active")}
        />,
      );

      expect(screen.getByText("Etapa 5 de 5 · Pronto")).toBeVisible();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5_000);
      });

      expect(handlers.onRefreshZapiStatus).toHaveBeenCalledWith("connection_1");
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not render a QR response for a connection that was replaced", async () => {
    const handlers = createHandlers();
    let resolveQr!: (value: { expiresAt: string; qrCode: string }) => void;
    handlers.onRequestZapiPairingQr = vi.fn(
      () =>
        new Promise<{ expiresAt: string; qrCode: string }>((resolve) => {
          resolveQr = resolve;
        }),
    );
    const first = createDisconnectedConnection("connection_1");
    const replacement = createDisconnectedConnection("connection_2");
    const { rerender } = render(
      <CrmWhatsappZapiSetup
        allowance={{ limit: 1, remaining: 0, used: 1 }}
        canPair={true}
        canSetup={false}
        connection={first}
        handlers={handlers}
        onBack={vi.fn()}
        onConnection={vi.fn()}
        zapiAddonContract={createZapiContract("active")}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Gerar QR Code" }));
    rerender(
      <CrmWhatsappZapiSetup
        allowance={{ limit: 1, remaining: 0, used: 1 }}
        canPair={true}
        canSetup={false}
        connection={replacement}
        handlers={handlers}
        onBack={vi.fn()}
        onConnection={vi.fn()}
        zapiAddonContract={createZapiContract("active")}
      />,
    );

    await act(async () => {
      resolveQr({
        expiresAt: "2099-08-10T12:00:00.000Z",
        qrCode: "data:image/png;base64,stale-qr",
      });
      await Promise.resolve();
    });

    expect(
      screen.queryByAltText("QR Code para conectar o WhatsApp"),
    ).not.toBeInTheDocument();
  });

  it("requires a user-entered phone before requesting a pairing code", async () => {
    const handlers = createHandlers();
    handlers.onRequestZapiPairingCode = vi.fn(async (_connectionId, phone) => ({
      code: `code-for-${phone}`,
      requested: true,
    }));

    render(
      <CrmWhatsappZapiSetup
        allowance={{ limit: 1, remaining: 0, used: 1 }}
        canPair={true}
        canSetup={false}
        connection={createDisconnectedConnection()}
        handlers={handlers}
        onBack={vi.fn()}
        onConnection={vi.fn()}
        zapiAddonContract={createZapiContract("active")}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Código do telefone" }));
    const requestButton = screen.getByRole("button", {
      name: "Solicitar código",
    });
    expect(requestButton).toBeDisabled();
    const phoneInput = screen.getByLabelText("Telefone para pareamento");
    fireEvent.change(phoneInput, {
      target: { value: "11999999999" },
    });
    expect(phoneInput).toHaveValue("+55 (11) 99999-9999");
    fireEvent.click(requestButton);

    await waitFor(() =>
      expect(handlers.onRequestZapiPairingCode).toHaveBeenCalledWith(
        "connection_1",
        "5511999999999",
      ),
    );
    expect(await screen.findByText("code-for-5511999999999")).toBeVisible();
  });

  it("invokes the authenticated webhook configuration mutation", async () => {
    const handlers = createHandlers();
    handlers.onConfigureZapiWebhooks = vi.fn(async () => ({
      results: [],
      setup: createSetupState("partial"),
    }));

    render(
      <CrmWhatsappZapiSetup
        allowance={{ limit: 1, remaining: 0, used: 1 }}
        canPair={true}
        canSetup={true}
        connection={createSetupConnection("failed")}
        handlers={handlers}
        onBack={vi.fn()}
        onConnection={vi.fn()}
        zapiAddonContract={createZapiContract("active")}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Verificar agora" }));

    await waitFor(() =>
      expect(handlers.onConfigureZapiWebhooks).toHaveBeenCalledWith(
        "connection_1",
      ),
    );
    expect(handlers.onRefreshConnections).not.toHaveBeenCalled();
  });

  it("keeps a webhook configuration failure visible", async () => {
    const handlers = createHandlers();
    handlers.onConfigureZapiWebhooks = vi.fn(async () => {
      throw new Error("Z-API indisponível");
    });

    render(
      <CrmWhatsappZapiSetup
        allowance={{ limit: 1, remaining: 0, used: 1 }}
        canPair={true}
        canSetup={true}
        connection={createSetupConnection("failed")}
        handlers={handlers}
        onBack={vi.fn()}
        onConnection={vi.fn()}
        zapiAddonContract={createZapiContract("active")}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Verificar agora" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Z-API indisponível",
    );
    expect(
      screen.getByText(/nenhuma ativação completa foi informada/i),
    ).toBeVisible();
  });

  it("shows each of the six server-owned webhook states", () => {
    render(
      <CrmWhatsappZapiSetup
        allowance={{ limit: 1, remaining: 0, used: 1 }}
        canPair={true}
        canSetup={true}
        connection={createSetupConnection("partial")}
        handlers={createHandlers()}
        onBack={vi.fn()}
        onConnection={vi.fn()}
        zapiAddonContract={createZapiContract("active")}
      />,
    );

    const list = screen.getByRole("list", {
      name: "Estado dos webhooks Z-API",
    });
    expect(within(list).getAllByRole("listitem")).toHaveLength(6);
    expect(within(list).getByText("Presença no chat")).toBeVisible();
    expect(within(list).getByText("Aparelho conectado")).toBeVisible();
    expect(within(list).getByText("Entrega de mensagens")).toBeVisible();
    expect(within(list).getByText("Aparelho desconectado")).toBeVisible();
    expect(within(list).getByText("Mensagens recebidas")).toBeVisible();
    expect(within(list).getByText("Status das mensagens")).toBeVisible();
    expect(within(list).getAllByText("Confirmado")).toHaveLength(5);
    expect(within(list).getByText("Pendente")).toBeVisible();
  });

  it("advances past pairing when the refreshed connection is configured and connected", async () => {
    const configured = createSetupState("configured");
    const connected: CrmProviderConnection = {
      ...createSetupConnection("configured"),
      live: {
        checkedAt: "2026-08-12T12:00:00.000Z",
        connected: true,
        connectedPhone: "5511999999999",
        providerStatus: "connected" as const,
        smartphoneConnected: true,
      },
      ready: true,
      status: "active" as const,
    };
    const handlers = createHandlers();
    handlers.onConfigureZapiWebhooks = vi.fn(async () => ({
      connection: connected,
      results: [],
      setup: configured,
    }));

    function SetupHarness() {
      const [connection, setConnection] = useState(() =>
        createSetupConnection("configuring"),
      );
      return (
        <CrmWhatsappZapiSetup
          allowance={{ limit: 1, remaining: 0, used: 1 }}
          canPair={true}
          canSetup={true}
          connection={connection}
          handlers={handlers}
          onBack={vi.fn()}
          onConnection={setConnection}
          zapiAddonContract={createZapiContract("active")}
        />
      );
    }

    render(<SetupHarness />);
    expect(screen.getByText("Etapa 3 de 5 · Configuração")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Verificar agora" }));

    expect(await screen.findByText("Etapa 5 de 5 · Pronto")).toBeVisible();
    expect(screen.getByText(/WhatsApp conectado e pronto/i)).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Gerar QR Code" }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Reconectar ou trocar aparelho",
      }),
    );
    expect(
      await screen.findByRole("button", { name: "Gerar QR Code" }),
    ).toBeVisible();
  });

  it("advances past pairing from the canonical ready connection projection", () => {
    const connection: CrmProviderConnection = {
      capabilities: [
        "inbound",
        "outbound",
        "text",
        "media",
        "scheduling",
        "conversation_start",
      ],
      channel: "whatsapp",
      displayName: "Z-API Matriz",
      id: "connection_1",
      isDefault: true,
      provider: "zapi",
      readiness: { ready: true, reason: null, reasonCode: "ready" },
      setup: createSetupState("configured"),
      state: "active",
    };

    render(
      <CrmWhatsappZapiSetup
        allowance={{ limit: 1, remaining: 0, used: 1 }}
        canPair={true}
        canSetup={true}
        connection={connection}
        handlers={createHandlers()}
        onBack={vi.fn()}
        onConnection={vi.fn()}
        zapiAddonContract={createZapiContract("active")}
      />,
    );

    expect(screen.getByText("Etapa 5 de 5 · Pronto")).toBeVisible();
    expect(screen.getByText(/WhatsApp conectado e pronto/i)).toBeVisible();
  });

  it("does not offer device pairing when the actor lacks pairing permission", () => {
    const connected: CrmProviderConnection = {
      ...createSetupConnection("configured"),
      live: {
        checkedAt: "2026-08-12T12:00:00.000Z",
        connected: true,
        connectedPhone: "5511999999999",
        providerStatus: "connected",
        smartphoneConnected: true,
      },
      ready: true,
      status: "active",
    };

    render(
      <CrmWhatsappZapiSetup
        allowance={{ limit: 1, remaining: 0, used: 1 }}
        canPair={false}
        canSetup={true}
        connection={connected}
        handlers={createHandlers()}
        onBack={vi.fn()}
        onConnection={vi.fn()}
        zapiAddonContract={createZapiContract("active")}
      />,
    );

    expect(
      screen.queryByRole("button", {
        name: "Reconectar ou trocar aparelho",
      }),
    ).not.toBeInTheDocument();
  });

  it("requires confirmation before disconnecting at Z-API and returns to pairing", async () => {
    const connected = {
      ...createSetupConnection("configured"),
      live: {
        checkedAt: "2026-08-12T12:00:00.000Z",
        connected: true,
        connectedPhone: "5511999999999",
        providerStatus: "connected" as const,
        smartphoneConnected: true,
      },
      ready: true,
      status: "active" as const,
    };
    const disconnected = createDisconnectedConnection();
    const handlers = createHandlers();
    handlers.onDisconnectZapi = vi.fn(async () => disconnected);

    function SetupHarness() {
      const [connection, setConnection] =
        useState<CrmProviderConnection>(connected);
      return (
        <CrmWhatsappZapiSetup
          allowance={{ limit: 1, remaining: 0, used: 1 }}
          canPair={true}
          canSetup={true}
          connection={connection}
          handlers={handlers}
          onBack={vi.fn()}
          onConnection={setConnection}
          zapiAddonContract={createZapiContract("active")}
        />
      );
    }

    render(<SetupHarness />);
    fireEvent.click(
      screen.getByRole("button", { name: "Desconectar WhatsApp da Z-API" }),
    );
    expect(handlers.onDisconnectZapi).not.toHaveBeenCalled();
    expect(
      screen.getByText(/webhooks e o histórico do CRM serão mantidos/i),
    ).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar desconexão" }),
    );

    await waitFor(() =>
      expect(handlers.onDisconnectZapi).toHaveBeenCalledWith("connection_1"),
    );
    expect(await screen.findByText("Etapa 4 de 5 · Pareamento")).toBeVisible();
    expect(screen.getByRole("button", { name: "Gerar QR Code" })).toBeVisible();
  });
});

function createHandlers(): CrmConnectionSelfServiceHandlers {
  return {
    onAuthorizeComposio: vi.fn(),
    onCompleteComposio: vi.fn(),
    onConfigureZapiWebhooks: vi.fn(async () => ({
      results: [],
      setup: createSetupState("configuring"),
    })),
    onCreate: vi.fn(async () => null),
    onRefreshConnections: vi.fn(async () => undefined),
    onSelectComposioSender: vi.fn(),
  };
}

async function saveZapiCredentials() {
  fireEvent.change(screen.getByLabelText("ID da instância"), {
    target: { value: "instance-1" },
  });
  fireEvent.change(screen.getByLabelText("Token da instância"), {
    target: { value: "instance-token" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Salvar credenciais" }));
}

function createZapiContract(
  status:
    "active" | "cancelled" | "paid_awaiting_setup" | "pending" | "scheduled",
): CrmWhatsappZapiAddonContract {
  return {
    addonCode: "crm_zapi",
    cancellationScheduledFor: null,
    id: "zapi_contract_1",
    monthlyPriceCents: 10000,
    paidAt: status === "active" ? "2099-08-10T12:00:00.000Z" : null,
    scheduledFor: "2099-08-10T12:00:00.000Z",
    setupCompletedAt: status === "active" ? "2099-08-10T12:00:00.000Z" : null,
    status,
    storeId: "store_1",
    supportCode: "ZAPI-TEST",
  };
}

function createDisconnectedConnection(
  id = "connection_1",
): CrmProviderConnection {
  return {
    displayName: "Z-API Matriz",
    externalConnectionId: null,
    externalInstanceId: "instance-1",
    id,
    live: {
      checkedAt: "2026-08-10T12:00:00.000Z",
      connected: false,
      connectedPhone: null,
      providerStatus: "disconnected",
      smartphoneConnected: false,
    },
    metadata: {
      catalogPhone: null,
      connectedPhone: null,
      migrationUnit: null,
      purpose: null,
    },
    phone: null,
    provider: "zapi",
    ready: true,
    setup: {
      attemptCount: 1,
      configuredAt: "2026-08-10T12:00:00.000Z",
      lastErrorCode: null,
      requestedAt: "2026-08-10T12:00:00.000Z",
      requiredTypes: zapiWebhookTypes,
      status: "configured",
      succeededTypes: zapiWebhookTypes,
      supportCode: "ZAPI-TEST",
      updatedAt: "2026-08-10T12:00:00.000Z",
      version: 1,
    },
    status: "disconnected",
    webhookUrl: null,
  };
}

function createSetupConnection(
  status: CrmWhatsappZapiSetupState["status"],
): CrmProviderConnection {
  return {
    ...createDisconnectedConnection(),
    ready: false,
    setup: createSetupState(status),
  };
}

function createSetupState(
  status: CrmWhatsappZapiSetupState["status"],
): CrmWhatsappZapiSetupState {
  return {
    attemptCount: status === "configuring" ? 0 : 1,
    configuredAt: status === "configured" ? "2026-08-12T12:00:00.000Z" : null,
    lastErrorCode: status === "failed" ? "PROVIDER_UNAVAILABLE" : null,
    requestedAt: "2026-08-12T12:00:00.000Z",
    requiredTypes: zapiWebhookTypes,
    status,
    succeededTypes:
      status === "configured"
        ? zapiWebhookTypes
        : status === "partial"
          ? zapiWebhookTypes.filter((type) => type !== "received")
          : [],
    supportCode: "ZAPI-TEST",
    updatedAt: "2026-08-12T12:00:00.000Z",
    version: 1,
  };
}

const zapiWebhookTypes = [
  "chat-presence",
  "connected",
  "delivery",
  "disconnected",
  "received",
  "status",
] as const;
