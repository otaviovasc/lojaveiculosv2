// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppApiError } from "../../lib/apiErrors";
import type { CrmConversationApi } from "./crmConversationApi";
import { useCrmConnections } from "./useCrmConnections";

describe("useCrmConnections", () => {
  it("does not let an older refresh failure replace a newer success", async () => {
    let rejectInitial!: (error: Error) => void;
    let resolveRefresh!: (
      payload: ReturnType<typeof connectionPayload>,
    ) => void;
    const initial = new Promise<ReturnType<typeof connectionPayload>>(
      (_, reject) => {
        rejectInitial = reject;
      },
    );
    const refresh = new Promise<ReturnType<typeof connectionPayload>>(
      (resolve) => {
        resolveRefresh = resolve;
      },
    );
    const listConnections = vi
      .fn()
      .mockReturnValueOnce(initial)
      .mockReturnValueOnce(refresh);
    const api = { listConnections } as unknown as CrmConversationApi;
    const { result } = renderHook(() => useCrmConnections(api));

    let refreshPromise!: Promise<void>;
    await act(async () => {
      refreshPromise = result.current.refreshConnections();
      resolveRefresh(connectionPayload("newer"));
      await refreshPromise;
      rejectInitial(new Error("old failure"));
    });

    await waitFor(() => {
      expect(result.current.connections).toEqual([
        expect.objectContaining({ id: "newer" }),
      ]);
    });
    expect(result.current.error).toBeNull();
  });

  it("refreshes the connection after configuring Z-API webhooks", async () => {
    const listConnections = vi
      .fn()
      .mockResolvedValueOnce(connectionPayload("connection_1"))
      .mockResolvedValueOnce(connectionPayload("configured_connection"));
    const configureZapiWebhooks = vi.fn(async () => ({
      results: [],
      setup: configuredSetup(),
    }));
    const api = {
      configureZapiWebhooks,
      listConnections,
    } as unknown as CrmConversationApi;
    const { result } = renderHook(() => useCrmConnections(api));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.configureZapiWebhooks("connection_1");
    });

    expect(configureZapiWebhooks).toHaveBeenCalledWith("connection_1");
    expect(listConnections).toHaveBeenCalledTimes(2);
    expect(result.current.connections).toEqual([
      expect.objectContaining({ id: "configured_connection" }),
    ]);
  });

  it("preserves the structured API error when connection creation fails", async () => {
    const failure = new AppApiError({
      code: "CRM_WHATSAPP_CONNECTION_PROVIDER_ALREADY_EXISTS",
      message: "Provider connection already exists.",
      requestId: "request-create-conflict",
      status: 409,
    });
    const api = {
      createConnection: vi.fn().mockRejectedValue(failure),
      listConnections: vi.fn().mockResolvedValue(connectionPayload("existing")),
    } as unknown as CrmConversationApi;
    const { result } = renderHook(() => useCrmConnections(api));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await expect(
        result.current.createConnection({
          channel: "whatsapp",
          provider: "zapi",
          instanceId: "instance-existing",
          instanceToken: "token-replacement",
        }),
      ).rejects.toBe(failure);
    });

    expect(result.current.error).toBe(failure);
  });

  it("keeps a successful setup when the deployed list response omits it", async () => {
    const listConnections = vi
      .fn()
      .mockResolvedValueOnce(connectionPayload("connection_1"))
      .mockResolvedValueOnce(connectionPayload("connection_1"));
    const api = {
      configureZapiWebhooks: vi.fn(async () => ({
        results: [],
        setup: configuredSetup(),
      })),
      listConnections,
    } as unknown as CrmConversationApi;
    const { result } = renderHook(() => useCrmConnections(api));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let configured!: Awaited<
      ReturnType<typeof result.current.configureZapiWebhooks>
    >;
    await act(async () => {
      configured = await result.current.configureZapiWebhooks("connection_1");
    });

    expect(configured.connection?.setup?.status).toBe("configured");
    expect(result.current.connections[0]?.setup?.status).toBe("configured");
  });

  it("keeps the fresh status mutation when the following list is older", async () => {
    const listConnections = vi
      .fn()
      .mockResolvedValueOnce(connectionPayload("connection_1"))
      .mockResolvedValueOnce(connectionPayload("connection_1"));
    const refreshedConnection = {
      ...connectionPayload("connection_1").connections[0],
      live: {
        checkedAt: "2099-08-10T12:00:00.000Z",
        connected: true,
        connectedPhone: "5511999999999",
        providerStatus: "connected",
        smartphoneConnected: true,
      },
    };
    const api = {
      listConnections,
      refreshZapiConnectionStatus: vi.fn(async () => refreshedConnection),
    } as unknown as CrmConversationApi;
    const { result } = renderHook(() => useCrmConnections(api));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let refreshed!: Awaited<
      ReturnType<typeof result.current.refreshZapiConnectionStatus>
    >;
    await act(async () => {
      refreshed =
        await result.current.refreshZapiConnectionStatus("connection_1");
    });

    expect(refreshed.live?.providerStatus).toBe("connected");
    expect(result.current.connections[0]?.live?.providerStatus).toBe(
      "connected",
    );
  });

  it("preserves a same-instance repair when the immediate list snapshot is stale", async () => {
    const listConnections = vi
      .fn()
      .mockResolvedValueOnce(connectionPayload("connection_1"))
      .mockResolvedValueOnce(connectionPayload("connection_1"));
    const repairedConnection = {
      ...connectionPayload("connection_1").connections[0],
      displayName: "Z-API reparada",
      ready: true,
      readiness: { ready: true, reason: null, reasonCode: "ready" },
      state: "active" as const,
      status: "active" as const,
    };
    const repairZapiConnectionCredentials = vi.fn(
      async () => repairedConnection,
    );
    const api = {
      listConnections,
      repairZapiConnectionCredentials,
    } as unknown as CrmConversationApi;
    const { result } = renderHook(() => useCrmConnections(api));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let repaired!: Awaited<
      ReturnType<typeof result.current.repairZapiConnectionCredentials>
    >;
    await act(async () => {
      repaired = await result.current.repairZapiConnectionCredentials(
        "connection_1",
        { instanceId: "instance-1", instanceToken: "token_new" },
      );
    });

    expect(repairZapiConnectionCredentials).toHaveBeenCalledWith(
      "connection_1",
      { instanceId: "instance-1", instanceToken: "token_new" },
    );
    expect(repaired.id).toBe("connection_1");
    expect(repaired.readiness?.ready).toBe(true);
    expect(result.current.connections).toHaveLength(1);
    expect(result.current.connections[0]?.id).toBe("connection_1");
    expect(result.current.connections[0]?.readiness?.ready).toBe(true);
    expect(result.current.connections[0]?.status).toBe("active");
  });

  it("returns a successful create without waiting for the list refresh", async () => {
    const refreshNeverCompletes = new Promise<
      ReturnType<typeof connectionPayload>
    >(() => undefined);
    const created = connectionPayload("created").connections[0]!;
    const api = {
      createConnection: vi.fn(async () => created),
      listConnections: vi
        .fn()
        .mockResolvedValueOnce(connectionPayload("existing"))
        .mockReturnValueOnce(refreshNeverCompletes),
    } as unknown as CrmConversationApi;
    const { result } = renderHook(() => useCrmConnections(api));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let resolved: unknown;
    await act(async () => {
      resolved = await result.current.createConnection({
        channel: "whatsapp",
        instanceId: "instance-created",
        instanceToken: "token-created",
        provider: "zapi",
      });
    });

    expect(resolved).toBe(created);
  });
});

function configuredSetup() {
  return {
    attemptCount: 1,
    configuredAt: "2026-08-12T12:00:00.000Z",
    lastErrorCode: null,
    requestedAt: "2026-08-12T12:00:00.000Z",
    requiredTypes: [],
    status: "configured" as const,
    succeededTypes: [],
    supportCode: "ZAPI-TEST",
    updatedAt: "2026-08-12T12:00:00.000Z",
    version: 1 as const,
  };
}

function connectionPayload(id: string) {
  return {
    allowance: { limit: 1, remaining: 0, used: 1 },
    availableSetups: [],
    connections: [
      {
        id,
        live: {
          checkedAt: "2026-08-10T12:00:00.000Z",
          connected: false,
          connectedPhone: null,
          providerStatus: "disconnected",
          smartphoneConnected: false,
        },
      },
    ],
  };
}
