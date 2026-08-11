import { vi } from "vitest";
import { BillingQuotaExceededError } from "../billing/ports/billingQuotaGuard.js";
import { createServiceContext } from "../../shared/serviceContext.js";
import { createTestCrmConnectionRepository } from "./testSupportConnections.js";
import type { CrmServicePorts } from "./services/CrmService/serviceSupport.js";

export const storeId = "11111111-1111-4111-8111-111111111111";
export const tenantId = "22222222-2222-4222-8222-222222222222";

export function createContext(
  permissions = ["crm.messaging.connection.setup"],
  entitlements: ("crm" | "crm_zapi")[] = ["crm", "crm_zapi"],
) {
  return createServiceContext({
    actor: { id: "user_1", kind: "user" },
    entitlements,
    permissions,
    request: { requestId: "request_1" },
    storeId,
    tenantId,
  });
}

export function createPorts(
  limit = 1,
  repository = createTestCrmConnectionRepository(),
): CrmServicePorts {
  return {
    billingQuotaGuard: createQuotaGuard(limit),
    crmConnectionCredentialVault: createCredentialVault(),
    crmConnectionRepository: repository,
    crmRepository: {} as never,
    transaction: (action) =>
      action(createPortsForTransaction(repository, limit)),
  };
}

function createPortsForTransaction(
  repository: ReturnType<typeof createTestCrmConnectionRepository>,
  limit: number,
): CrmServicePorts {
  return {
    billingQuotaGuard: {
      ...createQuotaGuard(limit),
      assertAvailable: vi.fn(async () => {
        const used = (
          await repository.listConnections({
            storeId: storeId as never,
            tenantId: tenantId as never,
          })
        ).filter((connection) => connection.status !== "archived").length;
        if (used >= limit) {
          throw new BillingQuotaExceededError({
            current: used,
            limit,
            quotaKey: "crm_zapi",
          });
        }
      }),
    },
    crmConnectionCredentialVault: createCredentialVault(),
    crmConnectionRepository: repository,
    crmRepository: {} as never,
  };
}

function createQuotaGuard(limit: number) {
  return {
    assertAvailable: vi.fn(async () => undefined),
    getAllowance: vi.fn(async () => ({
      limit,
      remaining: limit,
      used: 0,
    })),
  };
}

function createCredentialVault() {
  return {
    open: vi.fn(async ({ sealed }: { sealed: string }) => sealed),
    seal: vi.fn(
      async ({ plaintext }: { plaintext: string }) => `sealed:${plaintext}`,
    ),
  };
}

export function unconfiguredZapiConnection(
  credentialsRef: Record<string, unknown> = {},
) {
  return {
    credentialsRef,
    displayName: "Z-API pendente",
    externalConnectionId: null,
    externalInstanceId: null,
    id: "33333333-3333-4333-8333-333333333333",
    metadata: {},
    phone: null,
    provider: "zapi" as const,
    status: "sandbox" as const,
    storeId: storeId as never,
    tenantId: tenantId as never,
    webhookUrl: null,
  };
}
