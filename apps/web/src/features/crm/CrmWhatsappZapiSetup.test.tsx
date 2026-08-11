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
import { CrmWhatsappZapiSetup } from "./CrmWhatsappZapiSetup";
import type { CrmWhatsappSelfServiceHandlers } from "./CrmWhatsappSelfServiceSetup";
import type {
  CrmWhatsappProviderConnection,
  CrmWhatsappZapiAddonContract,
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
    fireEvent.click(screen.getByRole("button", { name: "Salvar e conectar" }));

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
});

function createHandlers(): CrmWhatsappSelfServiceHandlers {
  return {
    onAuthorizeComposio: vi.fn(),
    onCompleteComposio: vi.fn(),
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
    status: "disconnected",
    webhookUrl: null,
  };
}
