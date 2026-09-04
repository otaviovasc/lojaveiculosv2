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
import type { CrmProviderConnection } from "./crmConversationTypes";
import { CrmWhatsappZapiSetup } from "./CrmWhatsappZapiSetup";
import type { CrmConnectionSelfServiceHandlers } from "./CrmConnectionSelfServiceSetup";

describe("CrmWhatsappZapiSetup", () => {
  afterEach(cleanup);

  it("creates a BYOK connection with all three write-only credentials", async () => {
    const handlers = createHandlers();
    const onConnection = vi.fn();

    render(
      <CrmWhatsappZapiSetup
        canPair={false}
        canSetup
        connection={null}
        handlers={handlers}
        onBack={vi.fn()}
        onConnection={onConnection}
      />,
    );

    expect(screen.getByText("Etapa 1 de 4 · Credenciais")).toBeVisible();
    fillCredentials({
      clientToken: " client-secret ",
      instanceId: " instance-1 ",
      instanceToken: " instance-secret ",
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar credenciais" }));

    await waitFor(() =>
      expect(handlers.onCreate).toHaveBeenCalledWith({
        channel: "whatsapp",
        clientToken: "client-secret",
        instanceId: "instance-1",
        instanceToken: "instance-secret",
        provider: "zapi",
      }),
    );
    expect(onConnection).toHaveBeenCalled();
    expect(screen.queryByDisplayValue("client-secret")).toBeNull();
  });

  it("requires instance id, instance token, and client token", async () => {
    const handlers = createHandlers();
    render(
      <CrmWhatsappZapiSetup
        canPair={false}
        canSetup
        connection={null}
        handlers={handlers}
        onBack={vi.fn()}
        onConnection={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("ID da instância"), {
      target: { value: "instance-1" },
    });
    fireEvent.change(screen.getByLabelText("Token da instância"), {
      target: { value: "instance-secret" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar credenciais" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Informe as três credenciais",
    );
    expect(handlers.onCreate).not.toHaveBeenCalled();
  });

  it("does not reveal or enable credential entry without setup permission", () => {
    render(
      <CrmWhatsappZapiSetup
        canPair={false}
        canSetup={false}
        connection={null}
        handlers={createHandlers()}
        onBack={vi.fn()}
        onConnection={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("ID da instância")).toBeDisabled();
    expect(screen.getByLabelText("Token da instância")).toBeDisabled();
    expect(screen.getByLabelText("Client-Token")).toBeDisabled();
    expect(screen.getByText(/administrador da loja/i)).toBeVisible();
  });

  it("repairs a credentials_incomplete connection with all three credentials", async () => {
    const connection = createConnection({
      readiness: {
        ready: false,
        reason: "credentials_incomplete",
        reasonCode: "not_authorized",
      },
      revision: 7,
    });
    const handlers = createHandlers();
    handlers.onRepairZapiCredentials = vi.fn(async () => connection);

    render(
      <CrmWhatsappZapiSetup
        canPair={false}
        canRepairCredentials
        canSetup
        connection={connection}
        handlers={handlers}
        initialCredentialMode="repair"
        onBack={vi.fn()}
        onConnection={vi.fn()}
      />,
    );

    fillCredentials({
      clientToken: "client-new",
      instanceId: "instance-new",
      instanceToken: "instance-new-token",
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar novas credenciais" }),
    );

    await waitFor(() =>
      expect(handlers.onRepairZapiCredentials).toHaveBeenCalledWith(
        connection.id,
        {
          clientToken: "client-new",
          expectedRevision: 7,
          instanceId: "instance-new",
          instanceToken: "instance-new-token",
        },
      ),
    );
  });

  it("renders webhook readiness as an explicit pending state", () => {
    render(
      <CrmWhatsappZapiSetup
        canPair
        canSetup
        connection={createConnection({
          readiness: {
            ready: false,
            reason: "pending_webhook",
            reasonCode: "pending_webhook",
          },
          setup: {
            attemptCount: 1,
            configuredAt: null,
            lastErrorCode: null,
            requestedAt: "2026-08-25T12:00:00.000Z",
            requiredTypes: ["received", "delivery"],
            status: "configuring",
            succeededTypes: ["received"],
            supportCode: "ZAPI-SETUP",
            updatedAt: "2026-08-25T12:00:01.000Z",
            version: 2,
          },
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

  it("shows success only when server readiness is confirmed", () => {
    render(
      <CrmWhatsappZapiSetup
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

function fillCredentials(input: {
  clientToken: string;
  instanceId: string;
  instanceToken: string;
}) {
  fireEvent.change(screen.getByLabelText("ID da instância"), {
    target: { value: input.instanceId },
  });
  fireEvent.change(screen.getByLabelText("Token da instância"), {
    target: { value: input.instanceToken },
  });
  fireEvent.change(screen.getByLabelText("Client-Token"), {
    target: { value: input.clientToken },
  });
}

function createHandlers(): CrmConnectionSelfServiceHandlers {
  const connection = createConnection();
  return {
    onAuthorizeComposio: vi.fn(),
    onCompleteComposio: vi.fn(),
    onConfigureZapiWebhooks: vi.fn(),
    onCreate: vi.fn(async () => connection),
    onRefreshConnections: vi.fn(async () => undefined),
    onSelectComposioSender: vi.fn(),
  };
}

function createConnection(
  overrides: Partial<CrmProviderConnection> = {},
): CrmProviderConnection {
  return {
    channel: "whatsapp",
    displayName: "WhatsApp da loja",
    id: "connection-zapi",
    live: {
      checkedAt: "2026-08-25T12:00:00.000Z",
      connected: true,
      connectedPhone: "5511999999999",
      providerStatus: "connected",
      smartphoneConnected: true,
    },
    provider: "zapi",
    readiness: { ready: true, reason: null, reasonCode: "ready" },
    ready: true,
    setup: {
      attemptCount: 1,
      configuredAt: "2026-08-25T12:00:00.000Z",
      lastErrorCode: null,
      requestedAt: "2026-08-25T11:59:00.000Z",
      requiredTypes: ["received"],
      status: "configured",
      succeededTypes: ["received"],
      supportCode: "ZAPI-SETUP",
      updatedAt: "2026-08-25T12:00:00.000Z",
      version: 2,
    },
    state: "active",
    status: "active",
    ...overrides,
  };
}
