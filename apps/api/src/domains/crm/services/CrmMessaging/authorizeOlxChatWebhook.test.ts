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
import {
  CrmOlxWebhookSecurityUnavailableError,
  type CrmOlxWebhookSecurity,
} from "../../ports/crmOlxWebhookSecurity.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import { authorizeOlxChatWebhook } from "./authorizeOlxChatWebhook.js";
import type { OlxWebhookRejectedError } from "./authorizeOlxChatWebhook.js";

const connectionId = "24000000-0000-4000-8000-000000000101";
const storeId = "store_1" as StoreId;
const tenantId = "tenant_1" as TenantId;
const now = new Date("2026-08-10T12:01:00.000Z");
const expectedSecret = "olx_webhook_secret_0123456789abcdef0123456789abcdef";
const sourceFingerprint = "a".repeat(64);

describe("authorizeOlxChatWebhook", () => {
  it("applies the unauthenticated source limit before repository and credential work", async () => {
    const consume = vi.fn<CrmOlxWebhookSecurity["consume"]>(async () => false);
    const findConnectionById =
      vi.fn<CrmConnectionRepository["findConnectionById"]>();
    const open = vi.fn<CrmConnectionCredentialVault["open"]>();

    await expect(
      authorizeOlxChatWebhook(
        createContext(),
        validInput(),
        createPorts({ consume, findConnectionById, open }),
      ),
    ).rejects.toMatchObject({ status: 429 });

    expect(consume).toHaveBeenCalledWith({
      now,
      scope: "unauthenticated",
      sourceFingerprint,
    });
    expect(findConnectionById).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });

  it("does not consume the connection limit for invalid credentials", async () => {
    const consume = vi.fn<CrmOlxWebhookSecurity["consume"]>(async () => true);

    await expect(
      authorizeOlxChatWebhook(
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
      authorizeOlxChatWebhook(
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

    expect(open).not.toHaveBeenCalled();
  });

  it("rejects a secret shorter than a 32-byte base64url value", async () => {
    await expect(
      authorizeOlxChatWebhook(
        createContext(),
        validInput(),
        createPorts({ open: vi.fn(async () => "weak-webhook-secret") }),
      ),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("consumes the connection limit only after successful authentication", async () => {
    const consume = vi.fn<CrmOlxWebhookSecurity["consume"]>(async () => true);
    const open = vi.fn<CrmConnectionCredentialVault["open"]>(
      async () => expectedSecret,
    );

    const result = await authorizeOlxChatWebhook(
      createContext(),
      validInput(),
      createPorts({ consume, open }),
    );

    expect(result.authorized).toBe(true);
    expect(consume).toHaveBeenNthCalledWith(1, {
      now,
      scope: "unauthenticated",
      sourceFingerprint,
    });
    expect(consume).toHaveBeenNthCalledWith(2, {
      connectionId,
      now,
      provider: "olx_chat",
      scope: "connection",
      storeId,
      tenantId,
    });
    expect(open.mock.invocationCallOrder[0]).toBeLessThan(
      consume.mock.invocationCallOrder[1]!,
    );
  });

  it("fails closed when shared rate limiting is unavailable", async () => {
    const consume = vi.fn<CrmOlxWebhookSecurity["consume"]>(async () => {
      throw new CrmOlxWebhookSecurityUnavailableError();
    });

    await expect(
      authorizeOlxChatWebhook(
        createContext(),
        validInput(),
        createPorts({ consume }),
      ),
    ).rejects.toEqual(
      expect.objectContaining<Partial<OlxWebhookRejectedError>>({
        status: 503,
      }),
    );
  });

  it("does not include a rejected query secret in logs, audit, or errors", async () => {
    const rejectedSecret =
      "query_secret_must_never_be_observable_0123456789abcdef";
    const auditRecord = vi.fn<AuditSink["record"]>(async () => undefined);
    const logger = {
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    };

    await expect(
      authorizeOlxChatWebhook(
        createContext({ audit: { record: auditRecord }, logger }),
        { connectionId, sourceFingerprint, token: rejectedSecret },
        createPorts({}),
      ),
    ).rejects.toMatchObject({ message: "Invalid OLX Chat webhook token." });

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
    actor: { id: "olx", kind: "integration" },
    ...(options.audit ? { audit: options.audit } : {}),
    ...(options.logger ? { logger: options.logger } : {}),
    permissions: ["crm.whatsapp.ingest"],
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
    crmProviderRuntime: { olxChatEnabled: true },
    crmRepository: {} as never,
  };
}

function connection(overrides: Partial<CrmConnection> = {}): CrmConnection {
  return {
    credentialsRef: { stored: { webhookSecret: "sealed-secret" } },
    displayName: "OLX Chat",
    externalConnectionId: null,
    externalInstanceId: null,
    id: connectionId,
    metadata: {},
    phone: null,
    provider: "olx_chat" as const,
    status: "active" as const,
    storeId,
    tenantId,
    webhookUrl: null,
    ...overrides,
  };
}
