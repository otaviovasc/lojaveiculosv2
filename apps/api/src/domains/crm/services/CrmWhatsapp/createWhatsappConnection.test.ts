import { describe, expect, it } from "vitest";
import { AuthorizationError } from "../../../../shared/authorization.js";
import { createTestCrmConnectionRepository } from "../../testSupportConnections.js";
import {
  WhatsappConnectionCredentialStateError,
  WhatsappConnectionProviderAlreadyExistsError,
} from "../../whatsapp/whatsappConnectionCreation.js";
import { createWhatsappConnection } from "./createWhatsappConnection.js";
import {
  createContext,
  createPorts,
  storeId,
  tenantId,
  unconfiguredZapiConnection,
} from "../../testSupportWhatsappConnectionCreation.js";

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

  it("requires the customer channel setup permission", async () => {
    await expect(
      createWhatsappConnection(
        createContext([]),
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

  it("atomically configures an unconfigured Z-API connection exactly once", async () => {
    const repository = createTestCrmConnectionRepository([
      unconfiguredZapiConnection(),
    ]);
    const ports = createPorts(2, repository);

    const results = await Promise.allSettled([
      createWhatsappConnection(
        createContext(),
        {
          displayName: "Primeira",
          instanceId: "instance_first",
          instanceToken: "token_first",
          provider: "zapi",
        },
        ports,
      ),
      createWhatsappConnection(
        createContext(),
        {
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
      WhatsappConnectionProviderAlreadyExistsError,
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
    const repository = createTestCrmConnectionRepository([partial]);

    await expect(
      createWhatsappConnection(
        createContext(),
        {
          displayName: "Atendimento",
          instanceId: "replacement-instance",
          instanceToken: "replacement-token",
          provider: "zapi",
        },
        createPorts(2, repository),
      ),
    ).rejects.toBeInstanceOf(WhatsappConnectionCredentialStateError);
    expect(partial.credentialsRef).toEqual({
      mode: "stored",
      stored: { instanceId: "sealed:existing-instance" },
    });
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
