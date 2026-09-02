import { describe, expect, it, vi } from "vitest";
import { CrmWhatsappConnectionLimitError } from "../../channelConnections/connectionCreation.js";
import { createContext } from "../../testSupportCrmChannelConnectionCreation.js";
import { createCrmChannelConnection } from "./createCrmChannelConnection.js";
import {
  createUazapiPorts,
  uazapiTestAdminToken,
  whatsappConnectionFixture,
} from "./createCrmChannelConnection.uazapi.testSupport.js";

const adminToken = uazapiTestAdminToken;

describe("createCrmChannelConnection uazapi create mode", () => {
  it("provisions and seals a server-created uazapi connection", async () => {
    const { ports, provisioning } = createUazapiPorts();

    const result = await createCrmChannelConnection(
      createContext(),
      {
        adminToken,
        channel: "whatsapp",
        connectionPhoneNumber: "+55 11 99999-0000",
        displayName: "WhatsApp UAZAPI",
        mode: "create",
        provider: "uazapi",
      },
      ports,
    );

    expect(provisioning.createInstance).toHaveBeenCalledWith({
      adminToken,
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
    expect(stored.adminToken).toBe("sealed:store-admin-token");
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
          adminToken,
          channel: "whatsapp",
          displayName: "WhatsApp extra",
          mode: "create",
          provider: "uazapi",
        },
        ports,
      ),
    ).rejects.toBeInstanceOf(CrmWhatsappConnectionLimitError);
    expect(provisioning.createInstance).not.toHaveBeenCalled();
  });

  it("compensation-deletes the instance when persistence fails in create mode", async () => {
    const { ports, provisioning, repository } = createUazapiPorts();
    repository.createConnection = (() => {
      throw new Error("db unavailable");
    }) as never;

    await expect(
      createCrmChannelConnection(
        createContext(),
        {
          adminToken,
          channel: "whatsapp",
          displayName: "WhatsApp UAZAPI",
          mode: "create",
          provider: "uazapi",
        },
        ports,
      ),
    ).rejects.toThrow("db unavailable");
    expect(provisioning.deleteInstance).toHaveBeenCalledWith({
      adminToken,
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
          adminToken,
          channel: "whatsapp",
          displayName: "WhatsApp UAZAPI",
          mode: "create",
          provider: "uazapi",
        },
        ports,
      ),
    ).rejects.toThrow("uazapi admin unavailable");
  });
});
