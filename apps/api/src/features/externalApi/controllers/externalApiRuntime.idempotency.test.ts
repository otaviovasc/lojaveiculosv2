import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import { hashExternalApiKey } from "../../../domains/externalApi/crypto/apiKeyCrypto.js";
import type { ExternalApiRepository } from "../../../domains/externalApi/ports/externalApiRepository.js";
import { createHttpServiceContext } from "../../../infrastructure/http/createHttpServiceContext.js";
import { createExternalApiRequestLogger } from "../../../infrastructure/http/externalApiRequestLogger.js";
import { createMemoryCrmRepository } from "../../crm/adapters/memory/crmRepository.js";
import { createCrmServices } from "../../crm/controllers/crmServices.js";
import { createMemoryExternalApiRepository } from "../adapters/memory/externalApiRepository.js";
import { createExternalApiFeature } from "./externalApi.controller.js";

describe("external API idempotency lifecycle", () => {
  it("returns an explicit in-flight conflict for concurrent identical requests", async () => {
    const apiKey = "lv2_concurrent_secret";
    const repository = await externalApiRepository(apiKey);
    const baseCrm = createCrmServices({
      ports: { crmRepository: createMemoryCrmRepository() },
    });
    const started = deferred<void>();
    const release = deferred<void>();
    const crm = {
      ...baseCrm,
      createLead: vi.fn(
        async (...args: Parameters<typeof baseCrm.createLead>) => {
          started.resolve();
          await release.promise;
          return baseCrm.createLead(...args);
        },
      ),
    };
    const app = runtimeApp(repository, crm);
    const request = () => leadRequest(app, apiKey, "concurrent-1");

    const first = request();
    await started.promise;
    const concurrent = await request();
    expect(concurrent.status).toBe(409);
    await expect(readJson(concurrent)).resolves.toMatchObject({
      message:
        "An identical request with this Idempotency-Key is still in progress.",
    });

    release.resolve();
    expect((await first).status).toBe(201);
    expect(crm.createLead).toHaveBeenCalledTimes(1);
  });

  it("marks a 5xx attempt failed and requires a new retry key", async () => {
    const apiKey = "lv2_failed_secret";
    const repository = await externalApiRepository(apiKey);
    const baseCrm = createCrmServices({
      ports: { crmRepository: createMemoryCrmRepository() },
    });
    const crm = {
      ...baseCrm,
      createLead: vi.fn(async () => {
        throw new Error("database unavailable");
      }),
    };
    const app = runtimeApp(repository, crm);

    expect((await leadRequest(app, apiKey, "failed-1")).status).toBe(500);
    const retry = await leadRequest(app, apiKey, "failed-1");
    expect(retry.status).toBe(409);
    await expect(readJson(retry)).resolves.toMatchObject({
      message:
        "The previous request with this Idempotency-Key failed; retry with a new key.",
    });
    expect(crm.createLead).toHaveBeenCalledTimes(1);
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

function leadRequest(app: Hono, apiKey: string, idempotencyKey: string) {
  return app.request("/api/v1/external-api/leads", {
    body: JSON.stringify({ name: "Ana", phone: "11999990000" }),
    headers: {
      "content-type": "application/json",
      "idempotency-key": idempotencyKey,
      "x-api-key": apiKey,
    },
    method: "POST",
  });
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve };
}

async function externalApiRepository(apiKey: string) {
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
      return client
        ? { ...client, entitlements: ["crm", "external_api"] as const }
        : null;
    },
  } satisfies ExternalApiRepository;
}

async function readJson(response: Response) {
  return (await response.json()) as Record<string, unknown>;
}
