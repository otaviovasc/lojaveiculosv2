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
import { rememberPendingComposioConnection } from "./crmWhatsappComposioOAuth";
import type {
  CrmWhatsappOfficialSetupProvider,
  CrmWhatsappProviderConnection,
} from "./crmWhatsappTypes";
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

  it("keeps existing management visible without exposing setup actions", async () => {
    const connection = createZapiConnection("active");
    render(
      <CrmWhatsappSelfServiceSetup
        allowance={{ limit: 1, remaining: 0, used: 1 }}
        availableProviders={["composio_whatsapp", "zapi"]}
        canPair={true}
        canSetup={false}
        connections={[connection]}
        handlers={createHandlers()}
        startAtDirectory
      />,
    );

    expect(
      screen.getByText(/consultar e parear conexões existentes/i),
    ).toBeVisible();
    expect(screen.queryByText("Instagram Oficial")).not.toBeInTheDocument();
    expect(screen.queryByText("WhatsApp Oficial")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Z-API principal/ }));
    expect(await screen.findByRole("dialog")).toBeVisible();
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

  it("makes Instagram Official actionable when the server offers setup", () => {
    render(
      <CrmWhatsappSelfServiceSetup
        allowance={{ limit: 2, remaining: 2, used: 0 }}
        availableProviders={["composio_instagram"]}
        canPair={false}
        canSetup={true}
        handlers={createHandlers()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Instagram Oficial/i }));
    expect(
      screen.getByRole("heading", { name: "Configurar Instagram Oficial" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: /Autorizar com a Meta/i }),
    ).toBeVisible();
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

    const whatsappGroup = screen.getByRole("region", { name: "WhatsApp" });
    expect(within(whatsappGroup).getByText("WhatsApp Oficial")).toBeVisible();
    expect(within(whatsappGroup).getByText(/indisponível/i)).toBeVisible();
    expect(
      within(whatsappGroup).getByText(/nenhuma operação oficial foi iniciada/i),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /WhatsApp Oficial/i }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("Instagram Oficial").length).toBeGreaterThan(0);
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

    const whatsappGroup = screen.getByRole("region", { name: "WhatsApp" });
    expect(
      within(whatsappGroup).queryByText(
        /nenhuma operação oficial foi iniciada/i,
      ),
    ).not.toBeInTheDocument();
    fireEvent.click(
      within(whatsappGroup).getByRole("button", {
        name: /WhatsApp Oficial/i,
      }),
    );
    expect(
      screen.getByRole("button", { name: /Autorizar com a Meta/i }),
    ).toBeVisible();
  });

  it.each([
    [
      "Instagram",
      "composio_instagram",
      "Instagram Oficial",
      "Configurar Instagram Oficial",
    ],
    [
      "WhatsApp",
      "composio_whatsapp",
      "WhatsApp Oficial",
      "Configurar WhatsApp Oficial",
    ],
  ] as const)(
    "starts %s official authorization with the selected provider and connection id",
    async (_, provider, chooserName, dialogTitle) => {
      const handlers = createHandlers();
      const created = createOfficialConnection(provider);
      handlers.onCreate = vi.fn(async () => created);
      handlers.onAuthorizeComposio = vi.fn(async () => ({
        expiresAt: "2026-08-18T13:00:00.000Z",
        redirectUrl: `https://provider.local/${provider}`,
      }));
      const onRedirect = vi.fn();

      render(
        <CrmWhatsappSelfServiceSetup
          allowance={{ limit: 2, remaining: 2, used: 0 }}
          availableProviders={["composio_instagram", "composio_whatsapp"]}
          canPair={false}
          canSetup={true}
          connections={[
            createOfficialConnection(
              provider === "composio_instagram"
                ? "composio_whatsapp"
                : "composio_instagram",
            ),
          ]}
          handlers={handlers}
          onRedirect={onRedirect}
        />,
      );

      fireEvent.click(
        screen.getByRole("button", { name: new RegExp(chooserName) }),
      );
      expect(screen.getByRole("heading", { name: dialogTitle })).toBeVisible();
      fireEvent.click(
        screen.getByRole("button", { name: /Autorizar com a Meta/i }),
      );

      await waitFor(() => {
        expect(handlers.onCreate).toHaveBeenCalledWith({ provider });
        expect(handlers.onAuthorizeComposio).toHaveBeenCalledWith(created.id);
        expect(onRedirect).toHaveBeenCalledWith(
          `https://provider.local/${provider}`,
        );
      });
    },
  );

  it.each([
    ["Instagram", "composio_instagram", "perfil do Instagram"],
    ["WhatsApp", "composio_whatsapp", "número do WhatsApp"],
  ] as const)(
    "resumes the exact pending %s connection and selects its returned sender",
    async (_, provider, senderLabel) => {
      const connection = createOfficialConnection(provider);
      const otherProvider =
        provider === "composio_instagram"
          ? "composio_whatsapp"
          : "composio_instagram";
      const handlers = createHandlers();
      handlers.onCompleteComposio = vi.fn(async () => ({
        connection,
        nextAction: "select_sender",
        senders: [{ displayName: "Perfil Loja", senderId: "sender-1" }],
      }));
      handlers.onSelectComposioSender = vi.fn(async () => connection);
      rememberPendingComposioConnection(connection.id, provider);

      render(
        <CrmWhatsappSelfServiceSetup
          allowance={{ limit: 2, remaining: 0, used: 2 }}
          availableProviders={["composio_instagram", "composio_whatsapp"]}
          canPair={false}
          canSetup={true}
          connections={[createOfficialConnection(otherProvider), connection]}
          existingConnection={connection}
          handlers={handlers}
        />,
      );

      expect(await screen.findByText("Perfil Loja")).toBeVisible();
      expect(
        screen.getByRole("group", { name: new RegExp(senderLabel, "i") }),
      ).toBeVisible();
      expect(handlers.onCompleteComposio).toHaveBeenCalledWith(connection.id);

      fireEvent.click(screen.getByRole("button", { name: /Perfil Loja/i }));
      await waitFor(() =>
        expect(handlers.onSelectComposioSender).toHaveBeenCalledWith(
          connection.id,
          "sender-1",
        ),
      );
    },
  );

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
          connections={[connection]}
          handlers={{ ...createHandlers(), onSetConnectionPaused }}
          startAtDirectory
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: /Z-API principal/ }));
      fireEvent.click(await screen.findByRole("button", { name: actionLabel }));

      await waitFor(() => {
        expect(onSetConnectionPaused).toHaveBeenCalledWith(
          connection.id,
          paused,
        );
      });
    },
  );

  it("closes the setup dialog with Escape", async () => {
    render(
      <CrmWhatsappSelfServiceSetup
        allowance={{ limit: 1, remaining: 1, used: 0 }}
        availableProviders={["composio_whatsapp"]}
        canPair={false}
        canSetup={true}
        handlers={createHandlers()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /WhatsApp Oficial/i }));
    expect(await screen.findByRole("dialog")).toBeVisible();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("clears provider errors when setup closes and another provider opens", async () => {
    const handlers = createHandlers();
    handlers.onCreate = vi.fn(async () => {
      throw new Error("falha anterior");
    });
    render(
      <CrmWhatsappSelfServiceSetup
        allowance={{ limit: 1, remaining: 1, used: 0 }}
        availableProviders={["composio_whatsapp", "zapi"]}
        canPair={true}
        canSetup={true}
        handlers={handlers}
        zapiAddonContract={createZapiContract("active")}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /WhatsApp Oficial/i }));
    fireEvent.click(
      await screen.findByRole("button", { name: /Autorizar com a Meta/i }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "falha anterior",
    );

    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: /Z-API/i }));

    expect(await screen.findByRole("dialog")).toBeVisible();
    expect(screen.queryByText("falha anterior")).not.toBeInTheDocument();
  });

  it("clears official completion state when the setup dialog closes", async () => {
    const connection = createOfficialConnection("composio_whatsapp");
    const handlers = createHandlers();
    handlers.onCompleteComposio = vi.fn(async () => ({
      connection,
      nextAction: "select_sender",
      senders: [{ displayName: "Equipe antiga", senderId: "sender-1" }],
    }));
    rememberPendingComposioConnection(connection.id, "composio_whatsapp");

    render(
      <CrmWhatsappSelfServiceSetup
        allowance={{ limit: 1, remaining: 0, used: 1 }}
        availableProviders={["composio_whatsapp"]}
        canPair={false}
        canSetup={true}
        connections={[connection]}
        existingConnection={connection}
        handlers={handlers}
      />,
    );

    expect(await screen.findByText("Equipe antiga")).toBeVisible();
    fireEvent.keyDown(document, { key: "Escape" });
    const officialButtons = screen.getAllByRole("button", {
      name: /WhatsApp Oficial/i,
    });
    fireEvent.click(officialButtons[officialButtons.length - 1]!);

    expect(await screen.findByRole("dialog")).toBeVisible();
    expect(screen.queryByText("Equipe antiga")).not.toBeInTheDocument();
  });
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
    channel: "whatsapp" as const,
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

function createOfficialConnection(
  provider: CrmWhatsappOfficialSetupProvider,
): CrmWhatsappProviderConnection {
  return {
    ...createZapiConnection("active"),
    channel: provider === "composio_instagram" ? "instagram" : "whatsapp",
    displayName:
      provider === "composio_instagram"
        ? "Instagram Oficial principal"
        : "WhatsApp Oficial principal",
    externalConnectionId: `${provider}-account`,
    id: `${provider}-connection`,
    provider: "meta_cloud",
    readiness: { ready: true, reason: null, reasonCode: null },
  };
}
