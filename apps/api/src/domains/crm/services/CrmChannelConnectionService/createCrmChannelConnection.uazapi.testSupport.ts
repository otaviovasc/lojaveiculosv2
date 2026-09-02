import { vi } from "vitest";
import {
  createPorts,
  storeId,
  tenantId,
} from "../../testSupportCrmChannelConnectionCreation.js";
import { createTestCrmConnectionRepository } from "../../testSupportConnections.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";

export type UazapiProvisioningStub = NonNullable<
  CrmServicePorts["crmUazapiProvisioningProvider"]
>;

export const uazapiTestAdminToken = "store-admin-token";

export function createUazapiPorts(
  input: {
    initialConnections?: readonly CrmConnection[];
    provisioning?: Partial<UazapiProvisioningStub>;
  } = {},
) {
  const repository = createTestCrmConnectionRepository(
    input.initialConnections ?? [],
  );
  const provisioning: UazapiProvisioningStub = {
    createInstance: vi.fn(async ({ name }: { name: string }) => ({
      baseUrl: "https://free.uazapi.com",
      instanceId: `inst-${name}`,
      instanceToken: "instance-token-1",
    })),
    deleteInstance: vi.fn(async () => {}),
    listInstances: vi.fn(async () => [
      {
        connectedPhone: null,
        id: "inst-1",
        name: "Loja A",
        status: "disconnected",
        token: "instance-token-1",
      },
    ]),
    ...input.provisioning,
  };
  const ports: CrmServicePorts = {
    ...createPorts(0, repository),
    crmUazapiProvisioningProvider: provisioning,
  };
  return { ports, provisioning, repository };
}

export function whatsappConnectionFixture(
  overrides: Partial<CrmConnection> & { id: string },
): CrmConnection {
  return {
    broker: "direct",
    channel: "whatsapp",
    credentialsRef: {},
    displayName: "WhatsApp",
    externalConnectionId: null,
    externalInstanceId: null,
    metadata: {},
    phone: null,
    provider: "zapi",
    status: "active",
    storeId: storeId as never,
    tenantId: tenantId as never,
    webhookUrl: null,
    ...overrides,
  };
}
