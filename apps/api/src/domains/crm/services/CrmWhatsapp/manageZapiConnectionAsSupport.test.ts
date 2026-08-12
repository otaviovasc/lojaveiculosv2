import { describe, expect, it, vi } from "vitest";
import { createMemoryAuditSink } from "../../../../shared/auditSink.js";
import {
  createNoopServiceLogger,
  createServiceContext,
} from "../../../../shared/serviceContext.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import { createTestCrmConnectionRepository } from "../../testSupportConnections.js";
import { updateZapiCredentialsAsSupport } from "./manageZapiConnectionAsSupport.js";

const storeId = "25000000-0000-4000-8000-000000000001" as never;
const tenantId = "25000000-0000-4000-8000-000000000002" as never;

describe("updateZapiCredentialsAsSupport", () => {
  it("rotates credentials in place only for the verified same instance", async () => {
    const { audit, ports, repository } = setup();
    const result = await updateZapiCredentialsAsSupport(
      supportContext(audit),
      updateInput("instance-one", "token-two"),
      ports,
    );
    const connections = await repository.listConnections({ storeId, tenantId });

    expect(result.id).toBe("connection-one");
    expect(connections).toHaveLength(1);
    expect(connections[0]?.externalInstanceId).toBe("instance-one");
    expect(stored(connections[0], "webhookSecret")).toBe("sealed:webhook-one");
    expect(stored(connections[0], "instanceToken")).toBe("sealed:token-two");
    expect(audit.events.map((event) => event.action)).toContain(
      "crm.whatsapp.connection.zapi.credentials_rotated",
    );
  });

  it("archives a different instance and creates a new UUID and webhook secret", async () => {
    const { audit, ports, repository } = setup();
    const result = await updateZapiCredentialsAsSupport(
      supportContext(audit),
      updateInput("instance-two", "token-two"),
      ports,
    );
    const connections = await repository.listConnections({ storeId, tenantId });
    const archived = connections.find(({ id }) => id === "connection-one");
    const replacement = connections.find(({ id }) => id === result.id);

    expect(result.id).not.toBe("connection-one");
    expect(archived?.status).toBe("archived");
    expect(replacement?.externalInstanceId).toBe("instance-two");
    expect(stored(replacement, "webhookSecret")).not.toBe("sealed:webhook-one");
    expect(stored(replacement, "instanceToken")).toBe("sealed:token-two");
    expect(audit.events.map((event) => event.action)).toContain(
      "crm.whatsapp.connection.zapi.identity_replace",
    );
  });
});

function setup() {
  const audit = createMemoryAuditSink();
  const secrets = new Map([
    ["sealed:instance-one", "instance-one"],
    ["sealed:token-one", "token-one"],
    ["sealed:webhook-one", "webhook-one"],
  ]);
  let sequence = 0;
  const repository = createTestCrmConnectionRepository([connection()]);
  const ports = {
    crmConnectionCredentialVault: {
      open: async ({ sealed }: { sealed: string }) =>
        secrets.get(sealed) ?? sealed.replace(/^sealed:/u, ""),
      seal: async ({ plaintext }: { plaintext: string }) => {
        const sealed = plaintext.startsWith("webhook-")
          ? `sealed:webhook-new-${++sequence}`
          : `sealed:${plaintext}`;
        secrets.set(sealed, plaintext);
        return sealed;
      },
    },
    crmConnectionRepository: repository,
    crmRepository: {} as never,
    crmWhatsappGateway: {
      configureWebhooks: vi.fn(
        async (
          _connection: CrmConnection,
          input: {
            webhooks: readonly { type: string; url: string }[];
          },
        ) => ({
          results: input.webhooks.map((webhook) => ({
            error: null,
            ok: true,
            status: 200,
            type: webhook.type,
            url: webhook.url,
          })),
        }),
      ),
      getConnectionStatus: vi.fn(async () => ({
        checkedAt: new Date("2026-08-12T12:00:00.000Z"),
        connected: false,
        connectedPhone: null,
        providerStatus: "disconnected" as const,
        smartphoneConnected: false,
      })),
    } as never,
    crmZapiSupportAuthorizer: {
      assertPaidSetupEligible: vi.fn(async () => undefined),
    },
  };
  return { audit, ports, repository };
}

function connection(): CrmConnection {
  return {
    credentialsRef: {
      mode: "stored",
      stored: {
        instanceId: "sealed:instance-one",
        instanceToken: "sealed:token-one",
        webhookSecret: "sealed:webhook-one",
      },
    },
    displayName: "Z-API principal",
    externalConnectionId: null,
    externalInstanceId: "instance-one",
    id: "connection-one",
    metadata: {},
    phone: null,
    provider: "zapi",
    status: "sandbox",
    storeId,
    tenantId,
    webhookUrl: null,
  };
}

function supportContext(audit: ReturnType<typeof createMemoryAuditSink>) {
  return createServiceContext({
    actor: { id: "support-one", kind: "user" },
    audit,
    logger: createNoopServiceLogger(),
    permissions: ["tenant.manage"],
    request: { requestId: "request-one" },
    storeId: null,
    tenantId,
  });
}

function updateInput(instanceId: string, instanceToken: string) {
  return {
    basePath: "/api/v1/crm",
    canonicalApiOrigin: "https://api.example.test",
    connectionId: "connection-one",
    instanceId,
    instanceToken,
    storeId,
    tenantId,
  };
}

function stored(connection: CrmConnection | undefined, key: string) {
  const value = connection?.credentialsRef.stored;
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)[key]
    : null;
}
