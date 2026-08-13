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
import type { CrmWhatsappProviderConnection } from "./crmWhatsappTypes";
import {
  CrmWhatsappSelfServiceSetup,
  type CrmWhatsappSelfServiceHandlers,
} from "./CrmWhatsappSelfServiceSetup";

describe("CrmWhatsappSelfServiceSetup", () => {
  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
  });

  it("routes Z-API contracting to billing without collecting credentials", () => {
    const handlers = createHandlers();
    render(
      <CrmWhatsappSelfServiceSetup
        allowance={{ limit: 0, remaining: 0, used: 0 }}
        availableProviders={["zapi"]}
        canPair={false}
        canSetup={true}
        handlers={handlers}
        zapiAddonContract={createZapiContract("scheduled")}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Z-API/i }));
    expect(screen.getByText(/ativada no próximo vencimento/i)).toBeVisible();
    expect(screen.queryByLabelText(/token/i)).not.toBeInTheDocument();
    expect(handlers.onCreate).not.toHaveBeenCalled();
  });

  it("keeps setup controls behind the setup permission", () => {
    render(
      <CrmWhatsappSelfServiceSetup
        allowance={{ limit: 1, remaining: 0, used: 1 }}
        availableProviders={[]}
        canPair={false}
        canSetup={false}
        handlers={createHandlers()}
      />,
    );

    expect(screen.getByText(/permissões de gerenciar conexões/i)).toBeVisible();
  });

  it("keeps Official WhatsApp available when only the Z-API quota is zero", () => {
    render(
      <CrmWhatsappSelfServiceSetup
        allowance={{ limit: 0, remaining: 0, used: 0 }}
        availableProviders={["composio_whatsapp"]}
        canPair={false}
        canSetup={true}
        handlers={createHandlers()}
      />,
    );

    expect(
      screen.getByRole("button", { name: /WhatsApp Oficial/i }),
    ).toBeVisible();
    expect(
      screen.queryByText(/não possui uma conexão Z-API contratada/i),
    ).not.toBeInTheDocument();
  });

  it("shows included Instagram as support-assisted without inventing OAuth", () => {
    render(
      <CrmWhatsappSelfServiceSetup
        allowance={{ limit: 2, remaining: 2, used: 0 }}
        availableProviders={["composio_whatsapp"]}
        canPair={false}
        canSetup={true}
        handlers={createHandlers()}
      />,
    );

    expect(screen.getByText("Instagram incluído")).toBeVisible();
    expect(screen.getByText(/sem custo adicional no CRM/i)).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Pedir ajuda para configurar" }),
    ).toHaveAttribute("href", expect.stringContaining("5511940231407"));
  });

  it("keeps WhatsApp Oficial visible and honest when it is unavailable", () => {
    render(
      <CrmWhatsappSelfServiceSetup
        allowance={{ limit: 2, remaining: 2, used: 0 }}
        availableProviders={["zapi"]}
        canPair={false}
        canSetup={true}
        handlers={createHandlers()}
      />,
    );

    expect(screen.getByText("WhatsApp Oficial")).toBeVisible();
    expect(screen.getByText(/indisponível/i)).toBeVisible();
    expect(
      screen.getByText(/nenhuma operação oficial foi iniciada/i),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /WhatsApp Oficial/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Instagram incluído")).toBeVisible();
  });

  it("makes WhatsApp Oficial actionable when it is available", () => {
    render(
      <CrmWhatsappSelfServiceSetup
        allowance={{ limit: 2, remaining: 2, used: 0 }}
        availableProviders={["composio_whatsapp"]}
        canPair={false}
        canSetup={true}
        handlers={createHandlers()}
      />,
    );

    expect(
      screen.queryByText(/nenhuma operação oficial foi iniciada/i),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /WhatsApp Oficial/i }));
    expect(
      screen.getByRole("button", { name: /Autorizar com a Meta/i }),
    ).toBeVisible();
  });

  it.each([
    ["paused", "Retomar canal", false],
    ["active", "Pausar no CRM", true],
  ] as const)(
    "lets an authorized user change a %s connection lifecycle",
    async (status, actionLabel, paused) => {
      const onSetConnectionPaused = vi.fn(async () => undefined);
      const connection = createZapiConnection(status);

      render(
        <CrmWhatsappSelfServiceSetup
          allowance={{ limit: 1, remaining: 0, used: 1 }}
          availableProviders={["zapi"]}
          canPair={true}
          canSetup={true}
          existingConnection={connection}
          handlers={{ ...createHandlers(), onSetConnectionPaused }}
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: actionLabel }));

      await waitFor(() => {
        expect(onSetConnectionPaused).toHaveBeenCalledWith(
          connection.id,
          paused,
        );
      });
    },
  );
});

function createHandlers(): CrmWhatsappSelfServiceHandlers {
  return {
    onAuthorizeComposio: vi.fn(),
    onCompleteComposio: vi.fn(),
    onConfigureZapiWebhooks: vi.fn(),
    onCreate: vi.fn(async () => null),
    onRefreshConnections: vi.fn(async () => undefined),
    onSelectComposioSender: vi.fn(),
  };
}

function createZapiContract(
  status:
    "active" | "cancelled" | "paid_awaiting_setup" | "pending" | "scheduled",
) {
  return {
    addonCode: "crm_zapi" as const,
    cancellationScheduledFor: null,
    id: "zapi_contract_1",
    monthlyPriceCents: 10000,
    paidAt: null,
    scheduledFor: "2099-08-10T12:00:00.000Z",
    setupCompletedAt: null,
    status,
    storeId: "store_1",
    supportCode: "ZAPI-TEST",
  };
}

function createZapiConnection(
  status: "active" | "paused",
): CrmWhatsappProviderConnection {
  return {
    displayName: "Z-API principal",
    externalConnectionId: null,
    externalInstanceId: "instance-1",
    id: "connection-1",
    live: {
      checkedAt: "2026-08-13T12:00:00.000Z",
      connected: true,
      connectedPhone: "5511999999999",
      providerStatus: "connected",
      smartphoneConnected: true,
    },
    phone: "5511999999999",
    provider: "zapi",
    ready: true,
    setup: null,
    status,
    webhookUrl: null,
  };
}
