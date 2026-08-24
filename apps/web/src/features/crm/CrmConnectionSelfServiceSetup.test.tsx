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
import { rememberPendingComposioConnection } from "./crmComposioOAuth";
import type {
  CrmAvailableSetup,
  CrmOfficialChannelSetupProvider,
  CrmProviderConnection,
} from "./crmConversationTypes";
import {
  CrmConnectionSelfServiceSetup,
  type CrmConnectionSelfServiceHandlers,
} from "./CrmConnectionSelfServiceSetup";

describe("CrmConnectionSelfServiceSetup", () => {
  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
  });

  it("routes Z-API contracting to billing without collecting credentials", async () => {
    const handlers = createHandlers();
    render(
      <CrmConnectionSelfServiceSetup
        allowance={{ limit: 0, remaining: 0, used: 0 }}
        availableSetups={[
          { broker: "direct", channel: "whatsapp", provider: "zapi" },
        ]}
        canPair={false}
        canSetup={true}
        handlers={handlers}
        zapiAddonContract={createZapiContract("scheduled")}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Z-API/i }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveClass(
      "feature-dialog--large",
      "crm-connection-dialog",
    );
    expect(dialog.querySelector(".feature-dialog__heading")).toBeNull();
    expect(dialog.querySelector(".crm-zapi-guided-card h3")).toHaveTextContent(
      "Conectar WhatsApp · Z-API",
    );
    expect(screen.getByText(/ativada no próximo vencimento/i)).toBeVisible();
    expect(screen.queryByLabelText(/token/i)).not.toBeInTheDocument();
    expect(handlers.onCreate).not.toHaveBeenCalled();
  });

  it("keeps setup controls behind the setup permission", () => {
    render(
      <CrmConnectionSelfServiceSetup
        allowance={{ limit: 1, remaining: 0, used: 1 }}
        availableSetups={[]}
        canPair={false}
        canSetup={false}
        handlers={createHandlers()}
      />,
    );

    expect(screen.getByText(/permissões de gerenciar conexões/i)).toBeVisible();
  });

  it("pauses new setup when the store billing contract is unavailable", () => {
    render(
      <CrmConnectionSelfServiceSetup
        allowance={{ limit: 0, remaining: 0, used: 0 }}
        availableSetups={[
          { broker: "direct", channel: "whatsapp", provider: "zapi" },
        ]}
        billingState={{
          code: "BILLING_CONTRACT_UNAVAILABLE",
          status: "unavailable",
        }}
        canPair={false}
        canSetup
        handlers={createHandlers()}
      />,
    );

    expect(screen.getByText(/contrato de billing desta loja/i)).toBeVisible();
    expect(screen.queryByRole("button", { name: /Z-API/i })).toBeNull();
  });

  it("keeps existing management visible without exposing setup actions", async () => {
    const connection = createZapiConnection("active");
    render(
      <CrmConnectionSelfServiceSetup
        allowance={{ limit: 1, remaining: 0, used: 1 }}
        availableSetups={[
          { broker: "composio", channel: "whatsapp", provider: "meta_cloud" },
          { broker: "direct", channel: "whatsapp", provider: "zapi" },
        ]}
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

  it("advances an open Z-API setup when refreshed connections finish webhook setup", async () => {
    const handlers = createHandlers();
    const configuring = createZapiSetupConnection("configuring");
    const configured = createZapiSetupConnection("configured");
    const props = {
      allowance: { limit: 1, remaining: 0, used: 1 },
      availableSetups: [
        { broker: "direct", channel: "whatsapp", provider: "zapi" },
      ] satisfies CrmAvailableSetup[],
      canPair: true,
      canRepairCredentials: true,
      canSetup: true,
      handlers,
      startAtDirectory: true,
      zapiAddonContract: createZapiContract("active"),
    };
    const { rerender } = render(
      <CrmConnectionSelfServiceSetup {...props} connections={[configuring]} />,
    );

    const zapiSetupButtons = within(
      screen.getByRole("region", { name: "WhatsApp" }),
    ).getAllByRole("button");
    fireEvent.click(zapiSetupButtons[zapiSetupButtons.length - 1]!);
    expect(screen.getByText("Etapa 3 de 5 · Configuração")).toBeVisible();

    rerender(
      <CrmConnectionSelfServiceSetup {...props} connections={[configured]} />,
    );

    expect(await screen.findByText("Etapa 4 de 5 · Pareamento")).toBeVisible();
  });

  it("repairs an existing disconnected Z-API connection without calling create", async () => {
    const handlers = createHandlers();
    const disconnected = createZapiSetupConnection("configured");
    const otherDisconnected = {
      ...disconnected,
      displayName: "Z-API secundária",
      id: "connection-other",
    };
    const replacement = {
      ...disconnected,
      displayName: "Z-API reparada",
    };
    handlers.onRepairZapiCredentials = vi.fn(async () => replacement);
    handlers.onRequestZapiPairingQr = vi.fn(async () => ({
      expiresAt: "2099-08-19T20:00:00.000Z",
      qrCode: "data:image/png;base64,repaired",
    }));
    render(
      <CrmConnectionSelfServiceSetup
        allowance={{ limit: 1, remaining: 0, used: 1 }}
        availableSetups={[
          { broker: "direct", channel: "whatsapp", provider: "zapi" },
        ]}
        billingState={{
          code: "BILLING_CONTRACT_UNAVAILABLE",
          status: "unavailable",
        }}
        canPair
        canRepairCredentials
        canSetup
        connections={[otherDisconnected, disconnected]}
        handlers={handlers}
        startAtDirectory
        zapiAddonContract={createZapiContract("active")}
      />,
    );

    const repair = screen.getByRole("button", {
      name: /Z-API principal.*Reparar conexão/i,
    });
    expect(repair).toBeVisible();
    fireEvent.click(repair);

    expect(await screen.findByText("Etapa 4 de 5 · Pareamento")).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Atualizar credenciais da conexão",
      }),
    );
    fireEvent.change(screen.getByLabelText("ID da instância"), {
      target: { value: "instance-1" },
    });
    fireEvent.change(screen.getByLabelText("Token da instância"), {
      target: { value: "token-repaired" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar novas credenciais" }),
    );

    await waitFor(() =>
      expect(handlers.onRepairZapiCredentials).toHaveBeenCalledWith(
        disconnected.id,
        {
          instanceId: "instance-1",
          instanceToken: "token-repaired",
        },
      ),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Gerar QR Code" }),
    );
    await waitFor(() =>
      expect(handlers.onRequestZapiPairingQr).toHaveBeenCalledWith(
        disconnected.id,
      ),
    );
    expect(handlers.onCreate).not.toHaveBeenCalled();
  });

  it("opens direct replacement from a ready Z-API connection", async () => {
    const handlers = createHandlers();
    handlers.onReplaceZapiConnection = vi.fn(async () => ({
      connection: createZapiConnection("active"),
      operationId: "replacement-1",
      status: "verifying" as const,
    }));
    const connection = createZapiConnection("active");

    render(
      <CrmConnectionSelfServiceSetup
        allowance={{ limit: 1, remaining: 0, used: 1 }}
        availableSetups={[]}
        canPair
        canRepairCredentials
        canSetup
        connections={[connection]}
        handlers={handlers}
        startAtDirectory
        zapiAddonContract={createZapiContract("active")}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Z-API principal/i }));
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Trocar instância desta loja",
      }),
    );

    expect(
      await screen.findByRole("heading", {
        name: "Trocar instância desta loja",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Confirmar troca da instância" }),
    ).toBeVisible();
  });

  it("keeps the existing connection selected when another instance id is rejected", async () => {
    const handlers = createHandlers();
    const disconnected = createZapiSetupConnection("configured");
    handlers.onRepairZapiCredentials = vi.fn(async () => {
      throw new AppApiError({
        code: "CRM_ZAPI_IDENTITY_REPLACEMENT_REQUIRES_SUPPORT",
        message: "Identity replacement requires support.",
        requestId: "request-replacement",
        status: 409,
      });
    });

    render(
      <CrmConnectionSelfServiceSetup
        allowance={{ limit: 1, remaining: 0, used: 1 }}
        availableSetups={[
          { broker: "direct", channel: "whatsapp", provider: "zapi" },
        ]}
        canPair
        canRepairCredentials
        canSetup
        connections={[disconnected]}
        handlers={handlers}
        startAtDirectory
        zapiAddonContract={createZapiContract("active")}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /Z-API principal.*Reparar conexão/i,
      }),
    );
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Atualizar credenciais da conexão",
      }),
    );
    fireEvent.change(screen.getByLabelText("ID da instância"), {
      target: { value: "instance-from-another-account" },
    });
    fireEvent.change(screen.getByLabelText("Token da instância"), {
      target: { value: "token-new" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar novas credenciais" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /outra instância Z-API.*acione o suporte/i,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "ID do erro: request-replacement",
    );
    expect(handlers.onCreate).not.toHaveBeenCalled();
  });

  it("keeps Official WhatsApp available when only the Z-API quota is zero", () => {
    render(
      <CrmConnectionSelfServiceSetup
        allowance={{ limit: 0, remaining: 0, used: 0 }}
        availableSetups={[
          { broker: "composio", channel: "whatsapp", provider: "meta_cloud" },
        ]}
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
      <CrmConnectionSelfServiceSetup
        allowance={{ limit: 2, remaining: 2, used: 0 }}
        availableSetups={[
          { broker: "composio", channel: "instagram", provider: "meta_cloud" },
        ]}
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
      <CrmConnectionSelfServiceSetup
        allowance={{ limit: 2, remaining: 2, used: 0 }}
        availableSetups={[
          { broker: "direct", channel: "whatsapp", provider: "zapi" },
        ]}
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
      <CrmConnectionSelfServiceSetup
        allowance={{ limit: 2, remaining: 2, used: 0 }}
        availableSetups={[
          { broker: "composio", channel: "whatsapp", provider: "meta_cloud" },
        ]}
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
      "instagram",
      "meta_cloud",
      "Instagram Oficial",
      "Configurar Instagram Oficial",
    ],
    [
      "WhatsApp",
      "whatsapp",
      "meta_cloud",
      "WhatsApp Oficial",
      "Configurar WhatsApp Oficial",
    ],
  ] as const)(
    "starts %s official authorization with the selected provider and connection id",
    async (_, channel, provider, chooserName, dialogTitle) => {
      const handlers = createHandlers();
      const created = createOfficialConnection(provider, channel);
      handlers.onCreate = vi.fn(async () => created);
      handlers.onAuthorizeComposio = vi.fn(async () => ({
        expiresAt: "2026-08-18T13:00:00.000Z",
        redirectUrl: `https://provider.local/${provider}`,
      }));
      const onRedirect = vi.fn();

      render(
        <CrmConnectionSelfServiceSetup
          allowance={{ limit: 2, remaining: 2, used: 0 }}
          availableSetups={[
            { broker: "composio", channel: "whatsapp", provider: "meta_cloud" },
            {
              broker: "composio",
              channel: "instagram",
              provider: "meta_cloud",
            },
          ]}
          canPair={false}
          canSetup={true}
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
        expect(handlers.onCreate).toHaveBeenCalledWith({ channel, provider });
        expect(handlers.onAuthorizeComposio).toHaveBeenCalledWith(created.id);
        expect(onRedirect).toHaveBeenCalledWith(
          `https://provider.local/${provider}`,
        );
      });
    },
  );

  it("refreshes the real provider status from the manage dialog", async () => {
    const connection = createZapiConnection("active");
    const onRefreshZapiStatus = vi.fn(async () => connection);

    render(
      <CrmConnectionSelfServiceSetup
        allowance={{ limit: 1, remaining: 0, used: 1 }}
        availableSetups={[]}
        canPair={true}
        canSetup={true}
        connections={[connection]}
        handlers={{
          ...createHandlers(),
          onRefreshZapiStatus,
        }}
        startAtDirectory
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Z-API principal/i }));
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Atualizar status da conexão",
      }),
    );

    await waitFor(() =>
      expect(onRefreshZapiStatus).toHaveBeenCalledWith(connection.id),
    );
  });

  it.each([
    ["Instagram", "instagram", "perfil do Instagram"],
    ["WhatsApp", "whatsapp", "número do WhatsApp"],
  ] as const)(
    "resumes the exact pending %s connection and selects its returned sender",
    async (_, channel, senderLabel) => {
      const connection = createOfficialConnection("meta_cloud", channel);
      const otherChannel = channel === "instagram" ? "whatsapp" : "instagram";
      const handlers = createHandlers();
      handlers.onCompleteComposio = vi.fn(async () => ({
        connection,
        nextAction: "select_sender",
        senders: [{ displayName: "Perfil Loja", senderId: "sender-1" }],
      }));
      handlers.onSelectComposioSender = vi.fn(async () => connection);
      rememberPendingComposioConnection(connection.id, channel);

      render(
        <CrmConnectionSelfServiceSetup
          allowance={{ limit: 2, remaining: 0, used: 2 }}
          availableSetups={[
            { broker: "composio", channel: "whatsapp", provider: "meta_cloud" },
            {
              broker: "composio",
              channel: "instagram",
              provider: "meta_cloud",
            },
          ]}
          canPair={false}
          canSetup={true}
          connections={[
            {
              ...createOfficialConnection("meta_cloud"),
              channel: otherChannel,
            },
            { ...connection, channel },
          ]}
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
        <CrmConnectionSelfServiceSetup
          allowance={{ limit: 1, remaining: 0, used: 1 }}
          availableSetups={[
            { broker: "direct", channel: "whatsapp", provider: "zapi" },
          ]}
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
      <CrmConnectionSelfServiceSetup
        allowance={{ limit: 1, remaining: 1, used: 0 }}
        availableSetups={[
          { broker: "composio", channel: "whatsapp", provider: "meta_cloud" },
        ]}
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
      <CrmConnectionSelfServiceSetup
        allowance={{ limit: 1, remaining: 1, used: 0 }}
        availableSetups={[
          { broker: "composio", channel: "whatsapp", provider: "meta_cloud" },
          { broker: "direct", channel: "whatsapp", provider: "zapi" },
        ]}
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
    const connection = createOfficialConnection("meta_cloud", "whatsapp");
    const handlers = createHandlers();
    handlers.onCompleteComposio = vi.fn(async () => ({
      connection,
      nextAction: "select_sender",
      senders: [{ displayName: "Equipe antiga", senderId: "sender-1" }],
    }));
    rememberPendingComposioConnection(connection.id, "whatsapp");

    render(
      <CrmConnectionSelfServiceSetup
        allowance={{ limit: 1, remaining: 0, used: 1 }}
        availableSetups={[
          { broker: "composio", channel: "whatsapp", provider: "meta_cloud" },
        ]}
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

function createHandlers(): CrmConnectionSelfServiceHandlers {
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
): CrmProviderConnection {
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

function createZapiSetupConnection(
  setupStatus: "configured" | "configuring",
): CrmProviderConnection {
  const requiredTypes = [
    "chat-presence",
    "connected",
    "delivery",
    "disconnected",
    "received",
    "status",
  ] as const;
  return {
    ...createZapiConnection("active"),
    live: {
      checkedAt: "2026-08-19T19:00:00.000Z",
      connected: false,
      connectedPhone: null,
      providerStatus: "disconnected",
      smartphoneConnected: false,
    },
    ready: false,
    setup: {
      attemptCount: setupStatus === "configured" ? 2 : 1,
      configuredAt:
        setupStatus === "configured" ? "2026-08-19T19:00:00.000Z" : null,
      lastErrorCode: null,
      requestedAt: "2026-08-19T18:59:00.000Z",
      requiredTypes,
      status: setupStatus,
      succeededTypes: setupStatus === "configured" ? requiredTypes : [],
      supportCode: "ZAPI-TEST",
      updatedAt: "2026-08-19T19:00:00.000Z",
      version: 1,
    },
    state: "disconnected",
    status: "disconnected",
  };
}

function createOfficialConnection(
  provider: CrmOfficialChannelSetupProvider,
  channel: "instagram" | "whatsapp" = "instagram",
): CrmProviderConnection {
  return {
    ...createZapiConnection("active"),
    channel,
    displayName:
      channel === "instagram"
        ? "Instagram Oficial principal"
        : "WhatsApp Oficial principal",
    externalConnectionId: `${provider}-account`,
    id: `${provider}-connection`,
    provider: "meta_cloud",
    readiness: { ready: true, reason: null, reasonCode: null },
  };
}
