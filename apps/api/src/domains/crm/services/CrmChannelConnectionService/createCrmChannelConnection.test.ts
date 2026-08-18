import { describe, expect, it } from "vitest";
import { AuthorizationError } from "../../../../shared/authorization.js";
import { createTestCrmConnectionRepository } from "../../testSupportConnections.js";
import {
  CrmChannelConnectionCredentialStateError,
  CrmChannelConnectionProviderAlreadyExistsError,
} from "../../channelConnections/connectionCreation.js";
import { createCrmChannelConnection } from "./createCrmChannelConnection.js";
import {
  createContext,
  createPorts,
  storeId,
  tenantId,
  unconfiguredZapiConnection,
} from "../../testSupportCrmChannelConnectionCreation.js";

describe("createCrmChannelConnection", () => {
  it("creates a store-scoped sandbox connection inside the quota transaction", async () => {
    const ports = createPorts();

    const connection = await createCrmChannelConnection(
      createContext(),
      {
        channel: "whatsapp",
        displayName: "Atendimento",
        instanceId: "instance_1",
        instanceToken: "raw-secret",
        provider: "zapi",
      },
      ports,
    );

    expect(connection).toMatchObject({
      capabilities: [
        "catalog",
        "delete",
        "inbound",
        "outbound",
        "reactions",
        "text",
        "media",
        "scheduling",
        "conversation_start",
      ],
      displayName: "Atendimento",
      externalInstanceId: "instance_1",
      provider: "zapi",
      status: "sandbox",
    });
    const stored = await ports.crmConnectionRepository?.listConnections({
      storeId: storeId as never,
      tenantId: tenantId as never,
    });
    expect(stored).toHaveLength(1);
    expect(stored?.[0]?.externalInstanceId).toBe("instance_1");
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

  it("requires the customer channel setup permission", async () => {
    await expect(
      createCrmChannelConnection(
        createContext([]),
        {
          channel: "whatsapp",
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
    await createCrmChannelConnection(
      createContext(),
      {
        channel: "whatsapp",
        displayName: "Principal",
        instanceId: "instance_1",
        instanceToken: "raw-secret",
        provider: "zapi",
      },
      ports,
    );

    await expect(
      createCrmChannelConnection(
        createContext(),
        {
          channel: "whatsapp",
          displayName: "Secundária",
          instanceId: "instance_2",
          instanceToken: "raw-secret-2",
          provider: "zapi",
        },
        ports,
      ),
    ).rejects.toBeInstanceOf(CrmChannelConnectionProviderAlreadyExistsError);
  });

  it("atomically configures an unconfigured Z-API connection exactly once", async () => {
    const repository = createTestCrmConnectionRepository([
      {
        ...unconfiguredZapiConnection(),
        broker: "direct",
        channel: "whatsapp",
      },
    ]);
    const ports = createPorts(2, repository);

    const results = await Promise.allSettled([
      createCrmChannelConnection(
        createContext(),
        {
          channel: "whatsapp",
          displayName: "Primeira",
          instanceId: "instance_first",
          instanceToken: "token_first",
          provider: "zapi",
        },
        ports,
      ),
      createCrmChannelConnection(
        createContext(),
        {
          channel: "whatsapp",
          displayName: "Segunda",
          instanceId: "instance_second",
          instanceToken: "token_second",
          provider: "zapi",
        },
        ports,
      ),
    ]);

    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    const rejectionReason: unknown = rejected?.reason;
    expect(rejected).toMatchObject({
      status: "rejected",
    });
    expect(rejectionReason).toBeInstanceOf(
      CrmChannelConnectionProviderAlreadyExistsError,
    );
    const [stored] = await repository.listConnections({
      storeId: storeId as never,
      tenantId: tenantId as never,
    });
    const credentials = stored?.credentialsRef.stored as Record<
      string,
      unknown
    >;
    expect(String(credentials.instanceId)).toMatch(
      /^sealed:instance_(first|second)$/u,
    );
    expect(String(credentials.instanceToken)).toMatch(
      /^sealed:token_(first|second)$/u,
    );
    expect(String(credentials.instanceId).split("_").at(-1)).toBe(
      String(credentials.instanceToken).split("_").at(-1),
    );
  });

  it("fails explicitly without rotating a partial Z-API credential state", async () => {
    const partial = unconfiguredZapiConnection({
      mode: "stored",
      stored: { instanceId: "sealed:existing-instance" },
    });
    const repository = createTestCrmConnectionRepository([
      { ...partial, broker: "direct", channel: "whatsapp" },
    ]);

    await expect(
      createCrmChannelConnection(
        createContext(),
        {
          channel: "whatsapp",
          displayName: "Atendimento",
          instanceId: "replacement-instance",
          instanceToken: "replacement-token",
          provider: "zapi",
        },
        createPorts(2, repository),
      ),
    ).rejects.toBeInstanceOf(CrmChannelConnectionCredentialStateError);
    expect(partial.credentialsRef).toEqual({
      mode: "stored",
      stored: { instanceId: "sealed:existing-instance" },
    });
  });
});
