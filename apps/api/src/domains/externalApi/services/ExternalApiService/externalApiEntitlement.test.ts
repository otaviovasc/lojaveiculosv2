import { describe, expect, it } from "vitest";
import type {
  ExternalApiClient,
  ExternalApiRepository,
} from "../../ports/externalApiRepository.js";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { createExternalApiClient } from "./createExternalApiClient.js";
import { listExternalApiClients } from "./listExternalApiClients.js";
import { revokeExternalApiClient } from "./revokeExternalApiClient.js";

describe("External API entitlement", () => {
  it("blocks every client-management operation without the paid feature", async () => {
    const context = externalApiContext([]);
    const ports = {
      externalApiRepository: createTestRepository(),
    };

    await expect(listExternalApiClients(context, ports)).rejects.toThrow(
      "Missing entitlement: external_api",
    );
    await expect(
      createExternalApiClient(
        context,
        { name: "ERP", scopes: ["inventory.read"] },
        ports,
      ),
    ).rejects.toThrow("Missing entitlement: external_api");
    await expect(
      revokeExternalApiClient(context, { clientId: "client_1" }, ports),
    ).rejects.toThrow("Missing entitlement: external_api");
  });

  it("allows client management when permission and entitlement are present", async () => {
    const context = externalApiContext(["external_api"]);
    const ports = {
      externalApiRepository: createTestRepository(),
    };
    const created = await createExternalApiClient(
      context,
      { name: "ERP", scopes: ["inventory.read"] },
      ports,
    );

    await expect(listExternalApiClients(context, ports)).resolves.toHaveLength(
      1,
    );
    await expect(
      revokeExternalApiClient(context, { clientId: created.client.id }, ports),
    ).resolves.toMatchObject({ status: "revoked" });
  });
});

function externalApiContext(entitlements: readonly "external_api"[]) {
  return Object.assign(
    createServiceContext({
      actor: { id: "user_1", kind: "user" },
      permissions: ["external_api.manage"],
      request: { requestId: "request_1" },
      storeId: "store_1",
      tenantId: "tenant_1",
    }),
    { entitlements },
  );
}

function createTestRepository(): ExternalApiRepository {
  const clients: ExternalApiClient[] = [];
  return {
    authenticateByKeyHash: async () => null,
    countRecentRequests: async () => 0,
    createClient: async (input) => {
      const now = new Date();
      const client: ExternalApiClient = {
        createdAt: now,
        id: `client_${clients.length + 1}`,
        keyPrefixes: [input.keyPrefix],
        name: input.name,
        scopes: input.scopes,
        status: "active",
        storeId: input.storeId,
        tenantId: input.tenantId,
        updatedAt: now,
      };
      clients.push(client);
      return client;
    },
    listClients: async () => clients,
    recordRequest: async () => undefined,
    reserveIdempotencyKey: async () => ({ kind: "created" }),
    revokeClient: async ({ clientId }) => {
      const client = clients.find((candidate) => candidate.id === clientId);
      if (!client) return null;
      client.status = "revoked";
      return client;
    },
  };
}
