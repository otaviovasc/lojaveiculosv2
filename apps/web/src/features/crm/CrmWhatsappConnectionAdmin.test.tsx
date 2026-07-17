// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmWhatsappConnectionAdmin } from "./CrmWhatsappConnectionAdmin";
import type { CrmWhatsappProviderConnection } from "./crmWhatsappTypes";

describe("CrmWhatsappConnectionAdmin", () => {
  afterEach(() => cleanup());

  it("keeps connected credentials collapsed and saves write-only values", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn(async () => true);
    const onConfigureWebhooks = vi.fn(async () => webhookConfigResult());
    const { container } = render(
      <CrmWhatsappConnectionAdmin
        connections={[createConnectedConnection()]}
        onConfigureWebhooks={onConfigureWebhooks}
        onRefresh={vi.fn(async () => undefined)}
        onUpdate={onUpdate}
      />,
    );

    expect(screen.getByText("Online")).toBeVisible();
    expect(
      screen.queryByText("Configure somente a instância usada pelo CRM."),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("ID da instancia")).not.toBeVisible();
    expect(screen.queryByDisplayValue("old-secret")).not.toBeInTheDocument();

    const credentialDetails = container.querySelector(
      ".crm-whatsapp-connection-disclosure",
    );
    expect(credentialDetails).not.toBeNull();
    await user.click(credentialDetails!.querySelector("summary")!);

    expect(screen.getByLabelText("ID da instancia")).toBeVisible();
    expect(screen.getByLabelText("Token da instancia")).toHaveAttribute(
      "type",
      "password",
    );
    await user.clear(screen.getByLabelText("ID da instancia"));
    await user.type(screen.getByLabelText("ID da instancia"), "zapi-new");
    await user.type(
      screen.getByLabelText("Token da instancia"),
      "zapi-new-token",
    );
    await user.click(screen.getByRole("button", { name: "Salvar instancia" }));

    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith("connection_1", {
        instanceCredentials: {
          instanceId: "zapi-new",
          instanceToken: "zapi-new-token",
        },
      }),
    );
    // Saving credentials auto-registers the ZAPI webhooks.
    await waitFor(() =>
      expect(onConfigureWebhooks).toHaveBeenCalledWith("connection_1"),
    );
  });

  it("registers ZAPI webhooks on demand and reports the result", async () => {
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
      screen.getByRole("button", { name: /Configurar webhooks na ZAPI/i }),
    );

    await waitFor(() =>
      expect(onConfigureWebhooks).toHaveBeenCalledWith("connection_1"),
    );
    expect(
      await screen.findByText(/webhooks registrados na ZAPI automaticamente/i),
    ).toBeInTheDocument();
  });

  it("guides an unconfigured connection through one setup panel at a time", async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn(async () => undefined);
    const onUpdate = vi.fn(async () => true);
    render(
      <CrmWhatsappConnectionAdmin
        connections={[createDisconnectedConnection()]}
        onConfigureWebhooks={vi.fn(async () => null)}
        onRefresh={onRefresh}
        onUpdate={onUpdate}
      />,
    );

    expect(screen.getByText("Credenciais da instancia")).toBeVisible();
    expect(screen.queryByText("Webhooks da conexao")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continuar/i })).toBeDisabled();

    await user.type(screen.getByLabelText("ID da instancia"), "zapi-first");
    await user.type(
      screen.getByLabelText("Token da instancia"),
      "zapi-first-token",
    );
    await user.click(screen.getByRole("button", { name: /Continuar/i }));

    await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Webhooks da conexao")).toBeVisible();
    expect(
      screen.queryByText("Credenciais da instancia"),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Continuar/i }));
    expect(
      await screen.findByRole("heading", { name: "Verificar conexao" }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Verificar conexao" }));
    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
  });

  it("starts configured offline connections at webhook setup", () => {
    render(
      <CrmWhatsappConnectionAdmin
        connections={[
          createDisconnectedConnection({ credentialsConfigured: true }),
        ]}
        onConfigureWebhooks={vi.fn(async () => null)}
        onRefresh={vi.fn(async () => undefined)}
        onUpdate={vi.fn(async () => true)}
      />,
    );

    expect(screen.getByText("Webhooks da conexao")).toBeVisible();
    expect(screen.getByRole("button", { name: /Credenciais/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Verificar/i })).toBeDisabled();
  });
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
