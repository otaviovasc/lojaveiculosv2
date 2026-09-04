import type { AuditSink } from "@lojaveiculosv2/audit";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { describe, expect, it, vi } from "vitest";
import { AuthorizationError } from "../../../../shared/authorization.js";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type { ServiceLogger } from "../../../../shared/serviceLogger.js";
import type {
  CrmConnection,
  CrmConnectionRepository,
} from "../../ports/crmConnectionRepository.js";
import type { CrmConnectionCredentialVault } from "../../ports/crmConnectionSetupProvider.js";
import type { CrmOlxWebhookSecurity } from "../../ports/crmOlxWebhookSecurity.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import { authorizeUazapiWebhook } from "./authorizeUazapiWebhook.js";

const connectionId = "24000000-0000-4000-8000-000000000201";
const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const now = new Date("2026-08-10T12:01:00.000Z");
const expectedSecret = "uazapi_webhook_secret_0123456789abcdef0123456789";
const sourceFingerprint = "b".repeat(64);

describe("authorizeUazapiWebhook", () => {
  it("rejects invalid tokens without consuming the connection limit", async () => {
    const consume = vi.fn<CrmOlxWebhookSecurity["consume"]>(async () => true);

    await expect(
      authorizeUazapiWebhook(
        createContext(),
        { connectionId, sourceFingerprint, token: "wrong-secret" },
        createPorts({ consume }),
      ),
    ).rejects.toBeInstanceOf(AuthorizationError);

    expect(consume).toHaveBeenCalledTimes(1);
    expect(consume).toHaveBeenCalledWith({
      now,
      scope: "unauthenticated",
      sourceFingerprint,
    });
  });

  it.each([
    ["archived", { status: "archived" }],
    ["owned by another provider", { provider: "zapi" }],
    ["missing a webhook credential", { credentialsRef: { stored: {} } }],
  ])("rejects a connection that is %s", async (_reason, overrides) => {
    const open = vi.fn<CrmConnectionCredentialVault["open"]>();

    await expect(
      authorizeUazapiWebhook(
        createContext(),
        validInput(),
        createPorts({
          findConnectionById: vi.fn(async () =>
            connection(overrides as Partial<CrmConnection>),
          ),
          open,
        }),
      ),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("consumes the connection limit only after successful authentication", async () => {
    const consume = vi.fn<CrmOlxWebhookSecurity["consume"]>(async () => true);
    const open = vi.fn<CrmConnectionCredentialVault["open"]>(
      async () => expectedSecret,
    );

    const result = await authorizeUazapiWebhook(
      createContext(),
      validInput(),
      createPorts({ consume, open }),
    );

    expect(result).toEqual({ authorized: true, storeId, tenantId });
    expect(consume).toHaveBeenCalledWith({
      connectionId,
      now,
      provider: "uazapi",
      scope: "connection",
      storeId,
      tenantId,
    });
    expect(open.mock.invocationCallOrder[0]).toBeLessThan(
      consume.mock.invocationCallOrder[0]!,
    );
  });

  it("returns 429 when the connection rate limit is reached", async () => {
    const consume = vi.fn<CrmOlxWebhookSecurity["consume"]>(
      async (input) => input.scope === "unauthenticated",
    );

    await expect(
      authorizeUazapiWebhook(
        createContext(),
        validInput(),
        createPorts({ consume }),
      ),
    ).rejects.toMatchObject({ status: 429 });
  });

  it("does not include a rejected token in logs, audit, or errors", async () => {
    const rejectedSecret =
      "query_secret_must_never_be_observable_0123456789abcdef";
    const auditRecord = vi.fn<AuditSink["record"]>(async () => undefined);
    const logger = {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    };

    await expect(
      authorizeUazapiWebhook(
        createContext({ audit: { record: auditRecord }, logger }),
        { connectionId, sourceFingerprint, token: rejectedSecret },
        createPorts({}),
      ),
    ).rejects.toMatchObject({
      message: "Invalid CRM WhatsApp webhook token.",
    });

    const logCalls = Object.values(logger).flatMap((entry) => entry.mock.calls);
    expect(JSON.stringify([auditRecord.mock.calls, logCalls])).not.toContain(
      rejectedSecret,
    );
  });
});

function createContext(
  options: { audit?: AuditSink; logger?: ServiceLogger } = {},
) {
  return createServiceContext({
    actor: { id: "uazapi", kind: "integration" },
    ...(options.audit ? { audit: options.audit } : {}),
    ...(options.logger ? { logger: options.logger } : {}),
    permissions: ["crm.messages.ingest"],
    request: { requestId: "request_1" },
  });
}

function validInput() {
  return { connectionId, sourceFingerprint, token: expectedSecret };
}

function createPorts(overrides: {
  consume?: CrmOlxWebhookSecurity["consume"];
  findConnectionById?: CrmConnectionRepository["findConnectionById"];
  open?: CrmConnectionCredentialVault["open"];
}): CrmServicePorts {
  return {
    crmConnectionCredentialVault: {
      open: overrides.open ?? vi.fn(async () => expectedSecret),
      seal: vi.fn(async () => "sealed"),
    },
    crmConnectionRepository: {
      findConnectionById:
        overrides.findConnectionById ?? vi.fn(async () => connection()),
    } as never,
    crmOlxWebhookSecurity: {
      consume: overrides.consume ?? vi.fn(async () => true),
      futureSkewMs: 60_000,
      maxAgeMs: 600_000,
      now: () => now,
    },
    crmRepository: {} as never,
  } as never;
}

function connection(overrides: Partial<CrmConnection> = {}): CrmConnection {
  return {
    broker: "direct",
    channel: "whatsapp",
    credentialsRef: { stored: { webhookSecret: "sealed-secret" } },
    displayName: "Uazapi",
    externalConnectionId: null,
    externalInstanceId: null,
    id: connectionId,
    metadata: {},
    phone: null,
    provider: "uazapi",
    status: "active",
    storeId,
    tenantId,
    webhookUrl: null,
    ...overrides,
  };
}
