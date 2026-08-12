import { describe, expect, it, vi } from "vitest";
import { CrmOlxWebhookSecurityUnavailableError } from "../../domains/crm/ports/crmOlxWebhookSecurity.js";
import { resolveCrmPorts } from "../../features/crm/controllers/crmServicePorts.js";
import {
  createOlxWebhookSecurity,
  createOlxWebhookSourceFingerprint,
  createRedisOlxWebhookSecurity,
  CrmOlxWebhookSecurityConfigurationError,
  isOlxWebhookSourceAllowed,
} from "./olxWebhookSecurity.js";

const now = new Date("2026-08-10T12:01:00.000Z");

describe("createOlxWebhookSecurity", () => {
  it("keeps unauthenticated and connection buckets separate in local/test", async () => {
    const security = createOlxWebhookSecurity();

    for (let index = 0; index < 120; index += 1) {
      await expect(consumeConnection(security)).resolves.toBe(true);
    }
    await expect(consumeConnection(security)).resolves.toBe(false);
    for (let index = 0; index < 60; index += 1) {
      await expect(consumeUnauthenticated(security)).resolves.toBe(true);
    }
    await expect(consumeUnauthenticated(security)).resolves.toBe(false);
    expect(security.futureSkewMs).toBe(60_000);
    expect(security.maxAgeMs).toBe(600_000);
  });

  it("does not let unauthenticated traffic exhaust another connection", async () => {
    const security = createOlxWebhookSecurity();

    for (let index = 0; index < 60; index += 1) {
      await expect(
        consumeUnauthenticated(security, "connection_1"),
      ).resolves.toBe(true);
    }
    await expect(
      consumeUnauthenticated(security, "connection_1"),
    ).resolves.toBe(false);

    await expect(
      consumeUnauthenticated(security, "connection_2"),
    ).resolves.toBe(true);
    await expect(consumeConnection(security, "connection_1")).resolves.toBe(
      true,
    );
  });

  it("does not silently compose an in-memory limiter outside local/test", () => {
    expect(() => resolveCrmPorts({ environment: "production" })).toThrow(
      CrmOlxWebhookSecurityConfigurationError,
    );
  });
});

describe("isOlxWebhookSourceAllowed", () => {
  it("accepts the official OLX address by default in deployed environments", () => {
    expect(
      isOlxWebhookSourceAllowed("54.162.151.93", {
        APP_ENV: "staging",
        CRM_OLX_TRUST_PROXY_HEADERS: "true",
      }),
    ).toBe(true);
  });

  it("fails closed unless the deployed ingress explicitly owns proxy headers", () => {
    expect(
      isOlxWebhookSourceAllowed("54.162.151.93", { APP_ENV: "production" }),
    ).toBe(false);
    expect(
      isOlxWebhookSourceAllowed("54.162.151.93", {
        APP_ENV: "production",
        CRM_OLX_TRUST_PROXY_HEADERS: "TRUE",
      }),
    ).toBe(false);
  });

  it("fails closed for missing, malformed, multi-value, or unlisted deployed addresses", () => {
    const env = {
      APP_ENV: "production",
      CRM_OLX_TRUST_PROXY_HEADERS: "true",
    };
    expect(isOlxWebhookSourceAllowed(null, env)).toBe(false);
    expect(isOlxWebhookSourceAllowed("54.162.151.93, 203.0.113.1", env)).toBe(
      false,
    );
    expect(isOlxWebhookSourceAllowed("203.0.113.1", env)).toBe(false);
  });

  it("honors an explicit allowlist and rejects invalid configuration", () => {
    const env = {
      APP_ENV: "production",
      CRM_OLX_WEBHOOK_ALLOWED_IPS: "203.0.113.1,2001:db8::1",
      CRM_OLX_TRUST_PROXY_HEADERS: "true",
    };
    expect(isOlxWebhookSourceAllowed("203.0.113.1", env)).toBe(true);
    expect(isOlxWebhookSourceAllowed("54.162.151.93", env)).toBe(false);
    expect(() =>
      isOlxWebhookSourceAllowed("203.0.113.1", {
        APP_ENV: "production",
        CRM_OLX_WEBHOOK_ALLOWED_IPS: "203.0.113.1,not-an-ip",
        CRM_OLX_TRUST_PROXY_HEADERS: "true",
      }),
    ).toThrow(CrmOlxWebhookSecurityConfigurationError);
  });

  it("keeps local and test callbacks compatible without proxy headers", () => {
    expect(isOlxWebhookSourceAllowed(null, { APP_ENV: "local" })).toBe(true);
    expect(isOlxWebhookSourceAllowed(null, { NODE_ENV: "test" })).toBe(true);
  });
});

describe("createRedisOlxWebhookSecurity", () => {
  it("shares atomic counters across limiter instances", async () => {
    const counts = new Map<string, number>([
      [
        "crm:olx:webhook:rate:connection:olx_chat:tenant_1:store_1:connection_1",
        119,
      ],
    ]);
    const sendCommand = vi.fn(async (args: string[]) => {
      const key = args[3]!;
      const count = (counts.get(key) ?? 0) + 1;
      counts.set(key, count);
      return count;
    });
    const client = { sendCommand };
    const ensureReady = vi.fn(async () => undefined);
    const firstReplica = createRedisOlxWebhookSecurity(client, ensureReady);
    const secondReplica = createRedisOlxWebhookSecurity(client, ensureReady);

    await expect(consumeConnection(firstReplica)).resolves.toBe(true);
    await expect(consumeConnection(secondReplica)).resolves.toBe(false);

    expect(sendCommand).toHaveBeenNthCalledWith(
      1,
      expect.arrayContaining([
        "EVAL",
        "1",
        "crm:olx:webhook:rate:connection:olx_chat:tenant_1:store_1:connection_1",
        "60000",
      ]),
    );
    expect(String(sendCommand.mock.calls[0]?.[0][1])).toContain("PEXPIRE");
  });

  it("uses a fixed digest instead of client addresses in Redis keys", async () => {
    const sendCommand = vi.fn<(args: string[]) => Promise<unknown>>(
      async () => 1,
    );
    const security = createRedisOlxWebhookSecurity(
      { sendCommand },
      vi.fn(async () => undefined),
    );

    await consumeUnauthenticated(security, "connection_1", "203.0.113.44");

    const command = sendCommand.mock.calls[0]?.[0] ?? [];
    expect(command[3]).toMatch(
      /^crm:olx:webhook:rate:unauthenticated:[a-f0-9]{64}$/u,
    );
    expect(command.join(" ")).not.toContain("203.0.113.44");
    expect(command.join(" ")).not.toContain("connection_1");
  });

  it("fails explicitly when Redis cannot be reached", async () => {
    const security = createRedisOlxWebhookSecurity(
      { sendCommand: vi.fn() },
      vi.fn(async () => {
        throw new Error("redis unavailable");
      }),
    );

    await expect(consumeUnauthenticated(security)).rejects.toBeInstanceOf(
      CrmOlxWebhookSecurityUnavailableError,
    );
  });

  it("fails explicitly for an invalid Redis response", async () => {
    const security = createRedisOlxWebhookSecurity(
      { sendCommand: vi.fn(async () => null) },
      vi.fn(async () => undefined),
    );

    await expect(consumeUnauthenticated(security)).rejects.toBeInstanceOf(
      CrmOlxWebhookSecurityUnavailableError,
    );
  });
});

function consumeUnauthenticated(
  security: ReturnType<typeof createOlxWebhookSecurity>,
  connectionId = "connection_1",
  clientAddress = "203.0.113.10",
) {
  return security.consume({
    now,
    scope: "unauthenticated",
    sourceFingerprint: createOlxWebhookSourceFingerprint({
      clientAddress,
      connectionId,
    }),
  });
}

function consumeConnection(
  security: ReturnType<typeof createOlxWebhookSecurity>,
  connectionId = "connection_1",
) {
  return security.consume({
    connectionId,
    now,
    provider: "olx_chat",
    scope: "connection",
    storeId: "store_1",
    tenantId: "tenant_1",
  });
}
