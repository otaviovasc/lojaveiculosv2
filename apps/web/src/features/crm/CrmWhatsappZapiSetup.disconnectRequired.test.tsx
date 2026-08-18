// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppApiError } from "../../lib/apiErrors";
import { CrmWhatsappZapiSetup } from "./CrmWhatsappZapiSetup";
import type { CrmConnectionSelfServiceHandlers } from "./CrmConnectionSelfServiceSetup";
import type { CrmProviderConnection } from "./crmConversationTypes";

describe("CrmWhatsappZapiSetup disconnect-required pairing", () => {
  afterEach(cleanup);

  it.each(["qr", "code"] as const)(
    "requires confirmed provider disconnect before %s pairing retries",
    async (method) => {
      const providerConnected = createConnection(true);
      const providerDisconnected = createConnection(false);
      const handlers = createHandlers();
      const pairingError = new AppApiError({
        code: "CRM_CONNECTION_SETUP_PAIRING_DISCONNECT_REQUIRED",
        details: { nextAction: "disconnect_connection" },
        message: "Disconnect before pairing.",
        status: 409,
      });
      handlers.onRequestZapiPairingQr = vi.fn(async () => {
        throw pairingError;
      });
      handlers.onRequestZapiPairingCode = vi.fn(async () => {
        throw pairingError;
      });
      handlers.onDisconnectZapi = vi.fn(async () => providerConnected);
      handlers.onRefreshZapiStatus = vi.fn(async () => providerDisconnected);

      function Harness() {
        const [connection, setConnection] =
          useState<CrmProviderConnection>(providerDisconnected);
        return (
          <CrmWhatsappZapiSetup
            allowance={{ limit: 1, remaining: 0, used: 1 }}
            canPair={true}
            canSetup={true}
            connection={connection}
            handlers={handlers}
            onBack={vi.fn()}
            onConnection={setConnection}
            zapiAddonContract={{
              addonCode: "crm_zapi",
              cancellationScheduledFor: null,
              id: "contract_1",
              monthlyPriceCents: 10000,
              paidAt: "2026-08-13T12:00:00.000Z",
              scheduledFor: null,
              setupCompletedAt: "2026-08-13T12:00:00.000Z",
              status: "active",
              storeId: "store_1",
              supportCode: "ZAPI-TEST",
            }}
          />
        );
      }

      render(<Harness />);
      if (method === "code") {
        fireEvent.click(
          screen.getByRole("tab", { name: "Código do telefone" }),
        );
        fireEvent.change(screen.getByLabelText("Telefone para pareamento"), {
          target: { value: "11999999999" },
        });
        fireEvent.click(
          screen.getByRole("button", { name: "Solicitar código" }),
        );
      } else {
        fireEvent.click(screen.getByRole("button", { name: "Gerar QR Code" }));
      }

      expect(
        await screen.findByText(
          "Esta instância ainda está conectada a um aparelho",
        ),
      ).toBeVisible();
      expect(pairingButton(method)).toBeDisabled();
      fireEvent.click(
        screen.getByRole("button", { name: "Desconectar WhatsApp da Z-API" }),
      );
      expect(handlers.onDisconnectZapi).not.toHaveBeenCalled();
      fireEvent.click(
        screen.getByRole("button", { name: "Confirmar desconexão" }),
      );

      await waitFor(() =>
        expect(handlers.onDisconnectZapi).toHaveBeenCalledWith("connection_1"),
      );
      expect(
        screen.getByText("Aguardando a Z-API confirmar a desconexão"),
      ).toBeVisible();
      expect(pairingButton(method)).toBeDisabled();

      fireEvent.click(screen.getByRole("button", { name: "Verificar agora" }));
      await waitFor(() =>
        expect(handlers.onRefreshZapiStatus).toHaveBeenCalledWith(
          "connection_1",
        ),
      );
      await waitFor(() =>
        expect(
          screen.queryByText("Aguardando a Z-API confirmar a desconexão"),
        ).not.toBeInTheDocument(),
      );
      expect(pairingButton(method)).toBeEnabled();
    },
  );
});

function pairingButton(method: "code" | "qr") {
  return screen.getByRole("button", {
    name: method === "qr" ? "Gerar QR Code" : "Solicitar código",
  });
}

function createHandlers(): CrmConnectionSelfServiceHandlers {
  return {
    onAuthorizeComposio: vi.fn(),
    onCompleteComposio: vi.fn(),
    onConfigureZapiWebhooks: vi.fn(),
    onCreate: vi.fn(async () => null),
    onRefreshConnections: vi.fn(),
    onSelectComposioSender: vi.fn(),
  };
}

function createConnection(connected: boolean): CrmProviderConnection {
  const webhookTypes = [
    "received",
    "delivery",
    "status",
    "connected",
    "disconnected",
    "chat-presence",
  ];
  return {
    displayName: "Z-API",
    externalConnectionId: null,
    externalInstanceId: "instance-1",
    id: "connection_1",
    live: {
      checkedAt: "2026-08-13T12:00:00.000Z",
      connected,
      connectedPhone: connected ? "5511999999999" : null,
      providerStatus: connected ? "connected" : "disconnected",
      smartphoneConnected: connected,
    },
    phone: null,
    provider: "zapi",
    ready: false,
    setup: {
      attemptCount: 1,
      configuredAt: "2026-08-13T12:00:00.000Z",
      lastErrorCode: null,
      requestedAt: "2026-08-13T12:00:00.000Z",
      requiredTypes: webhookTypes,
      status: "configured",
      succeededTypes: webhookTypes,
      supportCode: "ZAPI-TEST",
      updatedAt: "2026-08-13T12:00:00.000Z",
      version: 1,
    },
    status: connected ? "active" : "disconnected",
    webhookUrl: null,
  };
}
