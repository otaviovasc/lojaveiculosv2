import { describe, expect, it, vi } from "vitest";
import { CrmWhatsappConnectionLimitError } from "../../channelConnections/connectionCreation.js";
import {
  createContext,
  createPorts,
  storeId,
  tenantId,
} from "../../testSupportCrmChannelConnectionCreation.js";
import { createTestCrmConnectionRepository } from "../../testSupportConnections.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import { createCrmChannelConnection } from "./createCrmChannelConnection.js";

type UazapiProvisioning = NonNullable<
  CrmServicePorts["crmUazapiProvisioningProvider"]
>;

function createUazapiPorts(
  input: {
    initialConnections?: readonly CrmConnection[];
    provisioning?: Partial<UazapiProvisioning>;
  } = {},
) {
  const repository = createTestCrmConnectionRepository(
    input.initialConnections ?? [],
  );
  const provisioning: UazapiProvisioning = {
    createInstance: vi.fn(async ({ name }: { name: string }) => ({
      baseUrl: "https://free.uazapi.com",
      instanceId: `inst-${name}`,
      instanceToken: "instance-token-1",
    })),
    deleteInstance: vi.fn(async () => {}),
    ...input.provisioning,
  };
  const ports: CrmServicePorts = {
    ...createPorts(0, repository),
    crmUazapiProvisioningProvider: provisioning,
  };
  return { ports, provisioning, repository };
}

function whatsappConnectionFixture(
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

describe("createCrmChannelConnection uazapi provider", () => {
  it("provisions and seals a server-created uazapi connection", async () => {
    const { ports, provisioning } = createUazapiPorts();

    const result = await createCrmChannelConnection(
      createContext(),
      {
        channel: "whatsapp",
        connectionPhoneNumber: "+55 11 99999-0000",
        displayName: "WhatsApp UAZAPI",
        provider: "uazapi",
      },
      ports,
    );

    expect(provisioning.createInstance).toHaveBeenCalledWith({
      name: expect.stringMatching(/^v2-/) as string,
    });
    expect(result).toMatchObject({
      broker: "direct",
      channel: "whatsapp",
      provider: "uazapi",
      status: "sandbox",
    });
    expect(result.capabilities).toEqual(
      expect.arrayContaining([
        "inbound",
        "outbound",
        "text",
        "media",
        "reactions",
        "delete",
        "conversation_start",
      ]),
    );
    expect(result.capabilities).not.toContain("catalog");
    expect(result.capabilities).not.toContain("templates");
    expect(result.phoneNumber).toBe("+55 11 99999-0000");
    const persisted = await ports.crmConnectionRepository?.findConnectionById(
      result.id,
    );
    expect(persisted?.externalInstanceId).toMatch(/^inst-v2-/);
    const stored = (persisted?.credentialsRef ?? {}).stored as Record<
      string,
      string
    >;
    expect(stored.baseUrl).toBe("sealed:https://free.uazapi.com");
    expect(stored.instanceToken).toBe("sealed:instance-token-1");
    expect(stored.webhookSecret).toMatch(/^sealed:/);
  });

  it("rejects creation when the store already has 3 active whatsapp connections", async () => {
    const { ports, provisioning } = createUazapiPorts({
      initialConnections: [
        whatsappConnectionFixture({ id: "conn-1", provider: "zapi" }),
        whatsappConnectionFixture({ id: "conn-2", provider: "uazapi" }),
        whatsappConnectionFixture({
          broker: "composio",
          id: "conn-3",
          provider: "meta_cloud",
        }),
        whatsappConnectionFixture({
          id: "conn-4",
          provider: "zapi",
          status: "archived",
        }),
      ],
    });

    await expect(
      createCrmChannelConnection(
        createContext(),
        {
          channel: "whatsapp",
          displayName: "WhatsApp extra",
          provider: "uazapi",
        },
        ports,
      ),
    ).rejects.toBeInstanceOf(CrmWhatsappConnectionLimitError);
    expect(provisioning.createInstance).not.toHaveBeenCalled();
  });

  it("compensation-deletes the instance when persistence fails", async () => {
    const { ports, provisioning, repository } = createUazapiPorts();
    repository.createConnection = (() => {
      throw new Error("db unavailable");
    }) as never;

    await expect(
      createCrmChannelConnection(
        createContext(),
        {
          channel: "whatsapp",
          displayName: "WhatsApp UAZAPI",
          provider: "uazapi",
        },
        ports,
      ),
    ).rejects.toThrow("db unavailable");
    expect(provisioning.deleteInstance).toHaveBeenCalledWith({
      baseUrl: "https://free.uazapi.com",
      instanceId: expect.stringMatching(/^inst-v2-/) as string,
    });
  });

  it("audits the failure when instance provisioning is rejected", async () => {
    const { ports } = createUazapiPorts({
      provisioning: {
        createInstance: vi.fn(async () => {
          throw new Error("uazapi admin unavailable");
        }),
      },
    });

    await expect(
      createCrmChannelConnection(
        createContext(),
        {
          channel: "whatsapp",
          displayName: "WhatsApp UAZAPI",
          provider: "uazapi",
        },
        ports,
      ),
    ).rejects.toThrow("uazapi admin unavailable");
  });
});
