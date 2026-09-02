import { describe, expect, it, vi } from "vitest";
import {
  CrmUazapiConnectionPhoneConflictError,
  CrmUazapiInstanceNotFoundError,
} from "../../channelConnections/connectionCreation.js";
import { createContext } from "../../testSupportCrmChannelConnectionCreation.js";
import { createCrmChannelConnection } from "./createCrmChannelConnection.js";
import { listUazapiInstances } from "./listUazapiInstances.js";
import {
  createUazapiPorts,
  uazapiTestAdminToken,
} from "./createCrmChannelConnection.uazapi.testSupport.js";

const adminToken = uazapiTestAdminToken;

describe("createCrmChannelConnection uazapi attach mode", () => {
  it("attaches an existing connected instance with its server-side token and phone", async () => {
    const { members, ports, provisioning } = createUazapiPorts({
      provisioning: {
        listInstances: vi.fn(async () => [
          {
            connectedPhone: "5511988880000",
            id: "inst-9",
            name: "Loja existente",
            status: "connected",
            token: "server-token-9",
          },
        ]),
      },
    });

    const result = await createCrmChannelConnection(
      createContext(),
      {
        adminToken,
        channel: "whatsapp",
        displayName: "WhatsApp UAZAPI",
        instanceId: "inst-9",
        mode: "attach",
        provider: "uazapi",
      },
      ports,
    );

    expect(provisioning.createInstance).not.toHaveBeenCalled();
    expect(result).toMatchObject({ provider: "uazapi", status: "sandbox" });
    expect(result.phoneNumber).toBe("5511988880000");
    const persisted = await ports.crmConnectionRepository?.findConnectionById(
      result.id,
    );
    expect(persisted?.externalInstanceId).toBe("inst-9");
    const stored = (persisted?.credentialsRef ?? {}).stored as Record<
      string,
      string
    >;
    expect(stored.adminToken).toBe("sealed:store-admin-token");
    expect(stored.instanceToken).toBe("sealed:server-token-9");
    expect(stored.instanceId).toBe("sealed:inst-9");
    expect(stored.baseUrl).toBeUndefined();
    expect(
      (persisted?.metadata as { uazapiWebhookSetup?: { state?: string } })
        .uazapiWebhookSetup?.state,
    ).toBe("pending");
    expect(members.grants).toEqual([
      expect.objectContaining({
        connectionId: result.id,
        grantedBy: "user_1",
        userId: "user_1",
      }),
    ]);
  });

  it("rejects attach when the instance is absent from the admin account", async () => {
    const { ports } = createUazapiPorts();

    await expect(
      createCrmChannelConnection(
        createContext(),
        {
          adminToken,
          channel: "whatsapp",
          displayName: "WhatsApp UAZAPI",
          instanceId: "missing",
          mode: "attach",
          provider: "uazapi",
        },
        ports,
      ),
    ).rejects.toBeInstanceOf(CrmUazapiInstanceNotFoundError);
  });

  it("does not compensation-delete when attach persistence fails", async () => {
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
          instanceId: "inst-1",
          mode: "attach",
          provider: "uazapi",
        },
        ports,
      ),
    ).rejects.toThrow("db unavailable");
    expect(provisioning.deleteInstance).not.toHaveBeenCalled();
  });

  it("maps a per-store phone unique violation to a conflict in attach mode", async () => {
    const { ports, provisioning } = createUazapiPorts();
    const repository = ports.crmConnectionRepository as {
      createConnection: unknown;
    };
    repository.createConnection = (() => {
      throw Object.assign(new Error("duplicate key value"), {
        code: "23505",
        constraint: "crm_channel_connections_whatsapp_phone_store_unique",
      });
    }) as never;
    provisioning.listInstances = vi.fn(async () => [
      {
        connectedPhone: "5511988880000",
        id: "inst-1",
        name: "Loja A",
        status: "connected",
        token: "instance-token-1",
      },
    ]);

    await expect(
      createCrmChannelConnection(
        createContext(),
        {
          adminToken,
          channel: "whatsapp",
          displayName: "WhatsApp UAZAPI",
          instanceId: "inst-1",
          mode: "attach",
          provider: "uazapi",
        },
        ports,
      ),
    ).rejects.toBeInstanceOf(CrmUazapiConnectionPhoneConflictError);
    expect(provisioning.deleteInstance).not.toHaveBeenCalled();
  });
});

describe("listUazapiInstances", () => {
  it("returns instances without exposing tokens", async () => {
    const { ports } = createUazapiPorts();

    const result = await listUazapiInstances(
      createContext(),
      { adminToken },
      ports,
    );

    expect(result).toEqual({
      instances: [
        {
          connectedPhone: null,
          id: "inst-1",
          name: "Loja A",
          status: "disconnected",
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain("instance-token-1");
  });

  it("propagates provider rejection without synthetic success", async () => {
    const { ports } = createUazapiPorts({
      provisioning: {
        listInstances: vi.fn(async () => {
          throw new Error("uazapi rejected the admin token");
        }),
      },
    });

    await expect(
      listUazapiInstances(createContext(), { adminToken }, ports),
    ).rejects.toThrow("uazapi rejected the admin token");
  });
});
