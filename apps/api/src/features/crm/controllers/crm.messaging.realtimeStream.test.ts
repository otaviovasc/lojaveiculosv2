import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createCrmRealtimeBroker } from "../../../infrastructure/crm/crmRealtimeBroker.js";
import type { ServiceLogger } from "../../../shared/serviceLogger.js";
import { createCrmSseResponse } from "./crm.messaging.realtimeStream.js";

const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;

describe("CRM realtime SSE stream", () => {
  afterEach(() => vi.useRealTimers());

  it("instruments heartbeats without changing their established interval", async () => {
    vi.useFakeTimers();
    const logger = createLogger();
    const response = createResponse({ logger });
    const reader = response.body!.getReader();
    await reader.read();

    const heartbeatRead = reader.read();
    await vi.advanceTimersByTimeAsync(15_000);

    const heartbeat = await heartbeatRead;
    expect(new TextDecoder().decode(heartbeat.value)).toBe(":heartbeat\n\n");
    expect(logger.info).toHaveBeenCalledWith("crm.realtime.heartbeat", {
      lastEventId: null,
    });
    await reader.cancel();
  });

  it("cancels the source and timers when the request is aborted", async () => {
    const logger = createLogger();
    const abortController = new AbortController();
    const broker = createCrmRealtimeBroker();
    const unsubscribe = vi.fn();
    vi.spyOn(broker, "subscribe").mockReturnValue(unsubscribe);
    const response = createResponse({
      broker,
      logger,
      signal: abortController.signal,
    });
    const reader = response.body!.getReader();
    await reader.read();

    abortController.abort();

    await expect(reader.read()).resolves.toMatchObject({ done: true });
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(logger.info).toHaveBeenCalledWith("crm.realtime.stream.abort", {
      lastEventId: null,
    });
  });

  it("closes the stream when replay fails so the client can reconnect", async () => {
    const logger = createLogger();
    const broker = createCrmRealtimeBroker();
    vi.spyOn(broker, "replay").mockRejectedValueOnce(
      new Error("replay unavailable"),
    );
    const response = createResponse({ broker, logger });
    const reader = response.body!.getReader();

    expect(new TextDecoder().decode((await reader.read()).value)).toContain(
      '"type":"connected"',
    );
    await expect(reader.read()).resolves.toMatchObject({ done: true });
    expect(logger.warn).toHaveBeenCalledWith("crm.realtime.replay.failed", {
      errorName: "Error",
    });
    expect(logger.info).toHaveBeenCalledWith(
      "crm.realtime.stream.replay_failed",
      { lastEventId: null },
    );
  });

  it("closes an open stream before delivering after authorization changes", async () => {
    let authorized = true;
    const logger = createLogger();
    const broker = createCrmRealtimeBroker();
    const response = createResponse({
      authorize: async () => authorized,
      broker,
      logger,
    });
    const reader = response.body!.getReader();
    await reader.read();
    await vi.waitFor(() =>
      expect(logger.info).toHaveBeenCalledWith(
        "crm.realtime.replay.completed",
        expect.any(Object),
      ),
    );

    authorized = false;
    await broker.publish({
      connectionId: "connection_1",
      phone: null,
      status: "ready",
      storeId,
      tenantId,
      type: "connection_status",
    });

    await expect(reader.read()).resolves.toMatchObject({ done: true });
    expect(logger.info).toHaveBeenCalledWith(
      "crm.realtime.stream.authorization_revoked",
      { lastEventId: null },
    );
  });
});

function createResponse(
  overrides: Partial<Parameters<typeof createCrmSseResponse>[0]> = {},
) {
  return createCrmSseResponse({
    broker: createCrmRealtimeBroker(),
    connectionId: null,
    queueVisibility: { kind: "global" },
    signal: new AbortController().signal,
    sinceEventId: null,
    storeId,
    tenantId,
    ...overrides,
  });
}

function createLogger() {
  return {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  } satisfies ServiceLogger;
}
