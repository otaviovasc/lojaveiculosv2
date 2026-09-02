import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { vi } from "vitest";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import type {
  CrmConnection,
  CrmConnectionRepository,
} from "../../ports/crmConnectionRepository.js";
import type { CrmMessagingGateway } from "../../ports/crmMessagingGateway.js";
import type { UazapiConnectionSetupProvider } from "../../ports/crmConnectionSetupProvider.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import { projectCanonicalCrmConnectionRow } from "../../ports/crmChannelConnectionProjection.js";

export const connectionId = "24000000-0000-4000-8000-000000000301";
export const storeId = "store_1" as StoreId;
export const tenantId = "tenant_1" as TenantId;

export const disconnectedStatus = {
  connected: false,
  connectedPhone: null,
  smartphoneConnected: false,
};
export const connectedStatus = {
  connected: true,
  connectedPhone: "5511999990000",
  smartphoneConnected: true,
};

export function createContext() {
  return createServiceContext({
    actor: { id: "actor-1", kind: "user" },
    entitlements: ["crm"],
    permissions: [
      "crm.messaging.connection.pair",
      "crm.messaging.connection.setup",
    ],
    request: { requestId: "request-1" },
    storeId,
    tenantId,
  });
}

export function createPorts(options: {
  connection?: CrmConnection;
  gateway?: Partial<CrmMessagingGateway>;
  provider?: Partial<UazapiConnectionSetupProvider>;
  repository?: CrmConnectionRepository;
}): CrmServicePorts {
  return {
    crmConnectionCredentialVault: {
      open: vi.fn(async ({ sealed }: { sealed: string }) =>
        sealed.replace(/^sealed:/u, ""),
      ),
      seal: vi.fn(
        async ({ plaintext }: { plaintext: string }) => `sealed:${plaintext}`,
      ),
    },
    crmConnectionRepository:
      options.repository ??
      createRepository(options.connection ?? connection()),
    crmMessagingGateway: {
      configureWebhooks: vi.fn(async () => ({ results: [] })),
      disconnectConnection: vi.fn(async () => ({
        disconnected: true as const,
      })),
      getConnectionStatus: vi.fn(async () => ({
        checkedAt: new Date(),
        connected: false,
        connectedPhone: null,
        providerStatus: "disconnected" as const,
        smartphoneConnected: false,
      })),
      ...options.gateway,
    } as never,
    uazapiConnectionSetupProvider: {
      getPairingCode: vi.fn(),
      getQrCode: vi.fn(),
      validateStatus: vi.fn(async () => disconnectedStatus),
      ...options.provider,
    },
  } as never;
}

export function createRepository(seed: CrmConnection): CrmConnectionRepository {
  let current = seed;
  return {
    findConnectionById: vi.fn(async (id: string) =>
      id === current.id ? current : null,
    ),
    updateConnection: vi.fn(
      async (input: {
        connectionId: string;
        metadata?: Record<string, unknown>;
        phone?: string;
        status?: CrmConnection["status"];
      }) => {
        if (input.connectionId !== current.id) return null;
        current = {
          ...current,
          ...(input.metadata ? { metadata: input.metadata } : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.status ? { status: input.status } : {}),
        };
        current = { ...current, canonical: projectCanonical(current) };
        return current;
      },
    ),
  } as never;
}

function projectCanonical(connection: CrmConnection) {
  return projectCanonicalCrmConnectionRow({
    broker: connection.broker,
    channel: connection.channel,
    credentialsRef: connection.credentialsRef,
    metadata: connection.metadata,
    provider: connection.provider,
    state: connection.status,
  });
}

export function connection(
  overrides: Partial<CrmConnection> = {},
): CrmConnection {
  const base: CrmConnection = {
    broker: "direct",
    channel: "whatsapp",
    credentialsRef: {
      mode: "stored",
      stored: {
        baseUrl: "sealed:https://uazapi.test",
        instanceId: "sealed:instance-1",
        instanceToken: "sealed:instance-token-1",
        webhookSecret: "sealed:webhook-secret",
      },
    },
    displayName: "Uazapi",
    externalConnectionId: null,
    externalInstanceId: "instance-1",
    id: connectionId,
    metadata: { uazapiWebhookSetup: { state: "pending" } },
    phone: null,
    provider: "uazapi",
    status: "sandbox",
    storeId,
    tenantId,
    webhookUrl: null,
    ...overrides,
  };
  return { ...base, canonical: projectCanonical(base) };
}
