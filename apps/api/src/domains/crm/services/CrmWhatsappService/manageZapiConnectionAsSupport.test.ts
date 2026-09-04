import { describe, expect, it } from "vitest";
import { updateZapiCredentialsAsSupport } from "./manageZapiConnectionAsSupport.js";
import {
  setup,
  stored,
  storeId,
  supportContext,
  tenantId,
  updateInput,
} from "./manageZapiConnectionAsSupport.testSupport.js";

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
      "crm.provider.zapi.connection.credentials_rotated",
    );
  });

  it("replaces a different instance in place and rotates the webhook secret", async () => {
    const { audit, ports, repository } = setup();
    const result = await updateZapiCredentialsAsSupport(
      supportContext(audit),
      updateInput("instance-two", "token-two"),
      ports,
    );
    const connections = await repository.listConnections({ storeId, tenantId });
    const replacement = connections.find(({ id }) => id === "connection-one");

    expect(result.id).toBe("connection-one");
    expect(connections).toHaveLength(1);
    expect(replacement?.externalInstanceId).toBeNull();
    expect(stored(replacement, "clientToken")).toBe("sealed:client-token");
    expect(stored(replacement, "webhookSecret")).not.toBe("sealed:webhook-one");
    expect(stored(replacement, "instanceToken")).toBe("sealed:token-two");
    expect(audit.events.map((event) => event.action)).toContain(
      "crm.provider.zapi.connection.replaced",
    );
    expect(
      audit.events.find(
        (event) => event.action === "crm.provider.zapi.connection.replaced",
      )?.metadata,
    ).toMatchObject({ permission: "crm.messaging.credentials.rotate" });
  });

  it("keeps the current instance operational when candidate callbacks fail verification", async () => {
    const { audit, configureWebhooks, ports, repository } = setup();
    configureWebhooks.mockResolvedValueOnce({
      results: [
        {
          error: null,
          ok: false,
          status: 503,
          type: "received",
          url: "https://api.example.test/api/v1/crm/whatsapp/webhooks/zapi/connection-one/received",
          verified: false,
        },
      ],
    });

    await expect(
      updateZapiCredentialsAsSupport(
        supportContext(audit),
        updateInput("instance-two", "token-two"),
        ports,
      ),
    ).rejects.toMatchObject({ code: "provider_rejected" });

    await expect(
      repository.findConnectionById("connection-one"),
    ).resolves.toMatchObject({
      externalInstanceId: "instance-one",
      status: "sandbox",
    });
    expect(
      stored(
        await repository.findConnectionById("connection-one"),
        "webhookSecret",
      ),
    ).toBe("sealed:webhook-one");
  });

  it("rejects tenant-scoped agency actors even if a support permission is injected", async () => {
    const { audit, ports } = setup();
    const agency = {
      ...supportContext(audit),
      billingManagedBy: "agency" as const,
      tenantId,
    };

    await expect(
      updateZapiCredentialsAsSupport(
        agency,
        updateInput("instance-one", "token-two"),
        ports,
      ),
    ).rejects.toThrow("platform support account context");
  });

  it("rejects a replacement callback destination outside the canonical API origin", async () => {
    const { audit, configureWebhooks, ports, repository } = setup({
      webhookUrl: "https://untrusted.example/callback",
    });

    await expect(
      updateZapiCredentialsAsSupport(
        supportContext(audit),
        updateInput("instance-two", "token-two"),
        ports,
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(configureWebhooks).not.toHaveBeenCalled();
    await expect(
      repository.findConnectionById("connection-one"),
    ).resolves.toMatchObject({ externalInstanceId: "instance-one" });
  });
});
