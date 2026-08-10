import { describe, expect, it, vi } from "vitest";
import { BillingQuotaExceededError } from "../../../billing/ports/billingQuotaGuard.js";
import { AuthorizationError } from "../../../../shared/authorization.js";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { createTestCrmConnectionRepository } from "../../testSupportConnections.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import { WhatsappConnectionProviderAlreadyExistsError } from "../../whatsapp/whatsappConnectionCreation.js";
import { createWhatsappConnection } from "./createWhatsappConnection.js";

const storeId = "11111111-1111-4111-8111-111111111111";
const tenantId = "22222222-2222-4222-8222-222222222222";

function createContext(
  permissions = [
    "crm.whatsapp.connection.manage",
    "crm.whatsapp.integrations.manage",
  ],
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

function createPorts(limit = 1): CrmServicePorts {
  const repository = createTestCrmConnectionRepository();
  return {
    billingQuotaGuard: {
      assertAvailable: vi.fn(async () => undefined),
      getAllowance: vi.fn(async () => ({
        limit,
        remaining: limit,
        used: 0,
      })),
    },
    crmConnectionCredentialVault: {
      open: vi.fn(async ({ sealed }: { sealed: string }) => sealed),
      seal: vi.fn(
        async ({ plaintext }: { plaintext: string }) => `sealed:${plaintext}`,
      ),
    },
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
      getAllowance: vi.fn(async () => ({
        limit,
        remaining: limit,
        used: 0,
      })),
    },
    crmConnectionCredentialVault: {
      open: vi.fn(async ({ sealed }: { sealed: string }) => sealed),
      seal: vi.fn(
        async ({ plaintext }: { plaintext: string }) => `sealed:${plaintext}`,
      ),
    },
    crmConnectionRepository: repository,
    crmRepository: {} as never,
  };
}

describe("createWhatsappConnection", () => {
  it("creates a store-scoped sandbox connection inside the quota transaction", async () => {
    const ports = createPorts();

    const connection = await createWhatsappConnection(
      createContext(),
      {
        displayName: "Atendimento",
        instanceId: "instance_1",
        instanceToken: "raw-secret",
        provider: "zapi",
      },
      ports,
    );

    expect(connection).toMatchObject({
      displayName: "Atendimento",
      provider: "zapi",
      status: "sandbox",
    });
    const stored = await ports.crmConnectionRepository?.listConnections({
      storeId: storeId as never,
      tenantId: tenantId as never,
    });
    expect(stored).toHaveLength(1);
    expect(stored?.[0]?.credentialsRef).toMatchObject({
      mode: "stored",
      stored: {
        instanceId: "sealed:instance_1",
        instanceToken: "sealed:raw-secret",
      },
    });
    expect(JSON.stringify(stored?.[0]?.credentialsRef)).toContain(
      '"webhookSecret":"sealed:',
    );
  });

  it("requires both connection and integration management permissions", async () => {
    await expect(
      createWhatsappConnection(
        createContext(["crm.whatsapp.connection.manage"]),
        {
          displayName: "Atendimento",
          instanceId: "instance_1",
          instanceToken: "raw-secret",
          provider: "zapi",
        },
        createPorts(),
      ),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });

  it("rejects a second non-archived connection for the same provider", async () => {
    const ports = createPorts(2);
    await createWhatsappConnection(
      createContext(),
      {
        displayName: "Principal",
        instanceId: "instance_1",
        instanceToken: "raw-secret",
        provider: "zapi",
      },
      ports,
    );

    await expect(
      createWhatsappConnection(
        createContext(),
        {
          displayName: "Secundária",
          instanceId: "instance_2",
          instanceToken: "raw-secret-2",
          provider: "zapi",
        },
        ports,
      ),
    ).rejects.toBeInstanceOf(WhatsappConnectionProviderAlreadyExistsError);
  });

  it("does not apply the paid Z-API quota to official WhatsApp", async () => {
    const ports = createPorts(0);

    await expect(
      createWhatsappConnection(
        createContext(),
        { displayName: "Atendimento", provider: "composio_whatsapp" },
        ports,
      ),
    ).resolves.toMatchObject({ provider: "composio_whatsapp" });
    expect(
      await ports.crmConnectionRepository?.listConnections({
        storeId: storeId as never,
        tenantId: tenantId as never,
      }),
    ).toHaveLength(1);
  });

  it("requires the CRM entitlement for Official WhatsApp", async () => {
    await expect(
      createWhatsappConnection(
        createContext(undefined, ["crm_zapi"]),
        { displayName: "Atendimento", provider: "composio_whatsapp" },
        createPorts(0),
      ),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});
