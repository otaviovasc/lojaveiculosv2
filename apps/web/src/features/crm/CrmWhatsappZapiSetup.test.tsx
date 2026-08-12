// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { CrmWhatsappZapiSetup } from "./CrmWhatsappZapiSetup";
import type { CrmWhatsappSelfServiceHandlers } from "./CrmWhatsappSelfServiceSetup";
import type {
  CrmWhatsappProviderConnection,
  CrmWhatsappZapiAddonContract,
  CrmWhatsappZapiSetupState,
} from "./crmWhatsappTypes";

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
    fireEvent.change(screen.getByLabelText("Token do cliente"), {
      target: { value: "client-token" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar credenciais" }));

    await waitFor(() =>
      expect(handlers.onCreate).toHaveBeenCalledWith({
        clientToken: "client-token",
        instanceId: "instance-1",
        instanceToken: "instance-token",
        provider: "zapi",
      }),
    );
    expect(onConnection).toHaveBeenCalledWith(created);
    expect(screen.getByLabelText("ID da instância")).toHaveValue("");
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
    fireEvent.change(screen.getByLabelText("Token do cliente"), {
      target: { value: "client-token" },
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

  it("advances past pairing when the refreshed connection is configured and connected", async () => {
    const configured = createSetupState("configured");
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
  });
});

function createHandlers(): CrmWhatsappSelfServiceHandlers {
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

function createDisconnectedConnection(): CrmWhatsappProviderConnection {
  return {
    displayName: "Z-API Matriz",
    externalConnectionId: null,
    externalInstanceId: "instance-1",
    id: "connection_1",
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
      requiredTypes: ["message-received"],
      status: "configured",
      succeededTypes: ["message-received"],
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
): CrmWhatsappProviderConnection {
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
    requiredTypes: ["message-received"],
    status,
    succeededTypes: status === "configured" ? ["message-received"] : [],
    supportCode: "ZAPI-TEST",
    updatedAt: "2026-08-12T12:00:00.000Z",
    version: 1,
  };
}
