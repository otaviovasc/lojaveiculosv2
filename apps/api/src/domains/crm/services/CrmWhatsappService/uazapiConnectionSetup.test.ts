import { describe, expect, it, vi } from "vitest";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import type { CrmMessagingProviderStatus } from "../../ports/crmMessagingGateway.js";
import { runUazapiWebhookSetupAttempt } from "./runUazapiWebhookSetupAttempt.js";
import {
  disconnectUazapiConnection,
  refreshUazapiConnectionStatus,
} from "./uazapiConnectionLifecycle.js";
import { readUazapiWebhookSetupState } from "../../whatsapp/uazapiWebhookSetupState.js";
import {
  connectedStatus,
  connection,
  connectionId,
  createContext,
  createPorts,
  createRepository,
  disconnectedStatus,
} from "./uazapiConnectionSetup.testSupport.js";

describe("runUazapiWebhookSetupAttempt", () => {
  it("registers the single uazapi webhook and persists the configured state", async () => {
    const configureWebhooks = vi.fn(
      async (
        _connection: CrmConnection,
        input: { webhooks: readonly { type: string; url: string }[] },
      ) => ({
        results: input.webhooks.map((webhook) => ({
          error: null,
          ok: true,
          status: 200,
          type: webhook.type,
          url: webhook.url,
          verified: true,
        })),
      }),
    );
    const repository = createRepository(connection());
    const ports = createPorts({
      gateway: { configureWebhooks },
      provider: { validateStatus: vi.fn(async () => connectedStatus) },
      repository,
    });

    const result = await runUazapiWebhookSetupAttempt(
      createContext(),
      {
        basePath: "/api/v1/crm",
        canonicalApiOrigin: "https://api.trusted.test",
        connectionId,
      },
      ports,
    );

    expect(result.setup.state).toBe("configured");
    expect(result.connectionStatus).toBe("active");
    expect(configureWebhooks).toHaveBeenCalledTimes(1);
    const webhook = configureWebhooks.mock.calls[0]?.[1].webhooks[0];
    expect(webhook?.type).toBe("uazapi");
    expect(webhook?.url).toBe(
      `https://api.trusted.test/api/v1/crm/whatsapp/webhooks/uazapi/${connectionId}?token=webhook-secret`,
    );
    const persisted = await repository.findConnectionById(connectionId);
    expect(
      readUazapiWebhookSetupState(persisted?.metadata ?? {}),
    ).toMatchObject({ attemptCount: 1, state: "configured" });
    expect(persisted?.status).toBe("active");
  });

  it("marks the setup failed when the provider rejects registration", async () => {
    const configureWebhooks = vi.fn(async () => {
      throw new Error("provider down");
    });
    const repository = createRepository(connection());
    const ports = createPorts({
      gateway: { configureWebhooks },
      provider: { validateStatus: vi.fn(async () => disconnectedStatus) },
      repository,
    });

    const result = await runUazapiWebhookSetupAttempt(
      createContext(),
      {
        basePath: "/api/v1/crm",
        canonicalApiOrigin: "https://api.trusted.test",
        connectionId,
      },
      ports,
    );

    expect(result).toMatchObject({
      connectionStatus: "unverified",
      results: [],
      setup: {
        attemptCount: 1,
        lastErrorCode: "request_failed",
        state: "failed",
      },
    });
    const persisted = await repository.findConnectionById(connectionId);
    expect(readUazapiWebhookSetupState(persisted?.metadata ?? {})?.state).toBe(
      "failed",
    );
  });
});

describe("uazapi connection lifecycle", () => {
  it("disconnects the provider session and persists the disconnected status", async () => {
    const disconnectConnection = vi.fn(async () => ({
      disconnected: true as const,
    }));
    const repository = createRepository(connection({ status: "active" }));
    const ports = createPorts({
      gateway: { disconnectConnection },
      repository,
    });

    const result = await disconnectUazapiConnection(
      createContext(),
      { connectionId },
      ports,
    );

    expect(disconnectConnection).toHaveBeenCalledTimes(1);
    expect(result.ready).toBe(false);
    const persisted = await repository.findConnectionById(connectionId);
    expect(persisted?.status).toBe("disconnected");
    expect(persisted?.metadata.connected).toBe(false);
  });

  it("refreshes the live status from the provider", async () => {
    const getConnectionStatus = vi.fn(
      async (): Promise<CrmMessagingProviderStatus> => ({
        checkedAt: new Date("2026-08-12T12:00:00.000Z"),
        connected: true,
        connectedPhone: "5511999990000",
        providerStatus: "connected",
        smartphoneConnected: true,
      }),
    );
    const repository = createRepository(connection({ status: "disconnected" }));
    const ports = createPorts({ gateway: { getConnectionStatus }, repository });

    const result = await refreshUazapiConnectionStatus(
      createContext(),
      { connectionId },
      ports,
    );

    expect(result.live.connected).toBe(true);
    const persisted = await repository.findConnectionById(connectionId);
    expect(persisted?.status).toBe("active");
    expect(persisted?.phone).toBe("5511999990000");
  });
});
