import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import { hashExternalApiKey } from "../../../domains/externalApi/crypto/apiKeyCrypto.js";
import type { ExternalApiRepository } from "../../../domains/externalApi/ports/externalApiRepository.js";
import {
  createServiceContext,
  type ServiceContext,
} from "../../../shared/serviceContext.js";
import { createHttpServiceContext } from "../../../infrastructure/http/createHttpServiceContext.js";
import { createExternalApiRequestLogger } from "../../../infrastructure/http/externalApiRequestLogger.js";
import { createMemoryExternalApiRepository } from "../adapters/memory/externalApiRepository.js";
import { createCrmServices } from "../../crm/controllers/crmServices.js";
import { createMemoryCrmRepository } from "../../crm/adapters/memory/crmRepository.js";
import { createExternalApiFeature } from "./externalApi.controller.js";
import type { LeadListJson } from "./externalApiRuntime.controller.testTypes.js";

describe("external API lead contract", () => {
  it("returns truthful pagination beyond the current page", async () => {
    const crm = createCrmServices({
      ports: { crmRepository: createMemoryCrmRepository() },
    });
    const app = createExternalApiFeature({
      contextFactory: async () => integrationContext(),
      runtimeServices: { crm },
    });

    for (const name of ["Ana Compradora", "Bia Compradora"]) {
      const response = await app.request("/leads", leadRequest(name));
      expect(response.status).toBe(201);
    }

    const response = await app.request("/leads?limit=1&page=1", {
      headers: { "x-api-key": "lv2_test_secret" },
    });
    const json = await readJson<LeadListJson>(response);
    expect(json.data).toHaveLength(1);
    expect(json.pagination).toEqual({
      hasMore: true,
      limit: 1,
      nextOffset: 1,
      page: 1,
      total: 2,
    });
  });

  it("fingerprints validated bodies and does not consume a key on validation", async () => {
    const apiKey = "lv2_testprefix_secret";
    const repository = await externalApiRepository(apiKey);
    const crm = createCrmServices({
      ports: { crmRepository: createMemoryCrmRepository() },
    });
    const createLead = vi.spyOn(crm, "createLead");
    const app = runtimeApp(repository, crm);
    const headers = {
      "content-type": "application/json",
      "idempotency-key": "lead-create-1",
      "x-api-key": apiKey,
    };

    const invalid = await app.request("/api/v1/external-api/leads", {
      body: JSON.stringify({}),
      headers,
      method: "POST",
    });
    expect(invalid.status).toBe(400);

    const privateMetadata = await app.request("/api/v1/external-api/leads", {
      body: JSON.stringify({
        metadata: { assignedUserId: "user_internal" },
        name: "Ana",
      }),
      headers,
      method: "POST",
    });
    expect(privateMetadata.status).toBe(400);

    const created = await app.request("/api/v1/external-api/leads", {
      body: JSON.stringify({ name: "Ana", phone: "11999990000" }),
      headers,
      method: "POST",
    });
    expect(created.status).toBe(201);
    const createdBody = await readJson<Record<string, unknown>>(created);

    const replay = await app.request("/api/v1/external-api/leads", {
      body: JSON.stringify({ phone: "11999990000", name: "Ana" }),
      headers,
      method: "POST",
    });
    expect(replay.status).toBe(201);
    expect(replay.headers.get("idempotency-replayed")).toBe("true");
    await expect(readJson<Record<string, unknown>>(replay)).resolves.toEqual(
      createdBody,
    );
    expect(createLead).toHaveBeenCalledTimes(1);

    const conflict = await app.request("/api/v1/external-api/leads", {
      body: JSON.stringify({ name: "Bia", phone: "11999990001" }),
      headers,
      method: "POST",
    });
    expect(conflict.status).toBe(409);
    await expect(
      readJson<Record<string, unknown>>(conflict),
    ).resolves.toMatchObject({
      message: "Idempotency-Key was already used for a different request.",
    });
  });

  it("requires the CRM entitlement before list, create, or update access", async () => {
    const apiKey = "lv2_no_crm_secret";
    const repository = await externalApiRepository(apiKey, ["external_api"]);
    const crm = createCrmServices({
      ports: { crmRepository: createMemoryCrmRepository() },
    });
    const listLeads = vi.spyOn(crm, "listLeads");
    const createLead = vi.spyOn(crm, "createLead");
    const updateLead = vi.spyOn(crm, "updateLead");
    const app = runtimeApp(repository, crm);
    const headers = { "x-api-key": apiKey };

    const responses = await Promise.all([
      app.request("/api/v1/external-api/leads", { headers }),
      app.request("/api/v1/external-api/leads", {
        body: JSON.stringify({ name: "Ana" }),
        headers: {
          ...headers,
          "content-type": "application/json",
          "idempotency-key": "no-crm-create",
        },
        method: "POST",
      }),
      app.request("/api/v1/external-api/leads/lead_1", {
        body: JSON.stringify({ status: "contacted" }),
        headers: {
          ...headers,
          "content-type": "application/json",
          "idempotency-key": "no-crm-update",
        },
        method: "PATCH",
      }),
    ]);

    expect(responses.map(({ status }) => status)).toEqual([403, 403, 403]);
    for (const response of responses) {
      await expect(
        readJson<Record<string, unknown>>(response),
      ).resolves.toMatchObject({
        code: "AUTHORIZATION_DENIED",
        message: "Missing entitlement: crm",
      });
    }
    expect(listLeads).not.toHaveBeenCalled();
    expect(createLead).not.toHaveBeenCalled();
    expect(updateLead).not.toHaveBeenCalled();
  });
});

function runtimeApp(
  repository: ExternalApiRepository,
  crm: ReturnType<typeof createCrmServices>,
) {
  const feature = createExternalApiFeature({
    contextFactory: (context) =>
      createHttpServiceContext(context, {
        externalApiRepository: repository,
      }),
    runtimeServices: { crm },
  });
  const app = new Hono();
  app.use("/api/v1/*", createExternalApiRequestLogger(repository));
  return app.route("/api/v1/external-api", feature);
}

function integrationContext(
  entitlements: readonly ("crm" | "external_api")[] = ["crm", "external_api"],
): ServiceContext {
  return {
    ...createServiceContext({
      actor: { id: "api_client_1", kind: "integration" },
      permissions: ["lead.create", "lead.read"],
      request: { requestId: "request_leads" },
      storeId: "store_1",
      tenantId: "tenant_1",
    }),
    entitlements,
  } as ServiceContext;
}

function leadRequest(name: string) {
  const phone = name.startsWith("Ana")
    ? "+55 11 99999-0001"
    : "+55 11 99999-0002";
  return {
    body: JSON.stringify({ name, phone }),
    headers: {
      "content-type": "application/json",
      "idempotency-key": `lead-${name}`,
      "x-api-key": "lv2_test_secret",
    },
    method: "POST" as const,
  };
}

async function externalApiRepository(
  apiKey: string,
  entitlements: readonly ("crm" | "external_api")[] = ["crm", "external_api"],
) {
  const memory = createMemoryExternalApiRepository();
  await memory.createClient({
    keyHash: hashExternalApiKey(apiKey),
    keyPrefix: "lv2_testprefix",
    name: "Lead importer",
    scopes: ["lead.create", "lead.read"],
    storeId: "store_1" as never,
    tenantId: "tenant_1" as never,
  });
  return {
    ...memory,
    authenticateByKeyHash: async (input) => {
      const client = await memory.authenticateByKeyHash(input);
      return client ? { ...client, entitlements } : null;
    },
  } satisfies ExternalApiRepository;
}

async function readJson<T>(response: Response) {
  return (await response.json()) as T;
}
