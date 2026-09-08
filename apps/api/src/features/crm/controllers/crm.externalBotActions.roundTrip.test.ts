import { describe, expect, it } from "vitest";
import { canonicalExternalBotActionRequest } from "../../../domains/crm/bot/externalBotCanonicalRequest.js";
import type { ExternalBotActionName } from "../../../domains/crm/bot/externalBotModels.js";
import { createMemoryCrmExternalBotIntegrationRepository } from "../adapters/memory/crmExternalBotIntegrationRepository.js";
import { createTestApp, expectApiError } from "./crm.controller.testSupport.js";
import { createRepositoryBoundExternalBotManager } from "./crm.externalBotIntegration.testSupport.js";

const apiToken = "bot-actions-api-token-with-32-characters";

async function createBotApp() {
  const repository = createMemoryCrmExternalBotIntegrationRepository();
  const manager = createRepositoryBoundExternalBotManager(repository);
  const app = createTestApp({
    crmExternalBotIntegrationRepository: repository,
    externalBotManager: manager.ports,
  });
  const configure = await app.request("/api/v1/crm/bot/configuration", {
    body: JSON.stringify({
      apiToken,
      enabled: true,
      webhookSecret: "bot-webhook-secret-value-32-characters",
      webhookUrl: "https://bot.example.test/webhook",
    }),
    method: "PATCH",
  });
  expect(configure.status).toBe(200);
  const read = await app.request("/api/v1/crm/bot/configuration");
  const { configuration } = (await read.json()) as {
    configuration: { id: string };
  };
  return { app, configuration, manager };
}

async function signedActionRequest(
  manager: ReturnType<typeof createRepositoryBoundExternalBotManager>,
  integrationId: string,
  overrides: Record<string, unknown> = {},
) {
  const action: ExternalBotActionName = "message.send_text";
  const base = {
    capabilityGrant: "",
    channel: "whatsapp" as const,
    command: {
      action,
      payload: { text: "Olá! Temos o veículo disponível para visita." },
    },
    connectionId: "connection-1",
    expectedAttendanceRevision: 2,
    expectedRevision: 1,
    idempotencyKey: `idem-${Math.random().toString(36).slice(2)}`,
    integrationId,
    modelVersion: "model-v1",
    provider: "zapi" as const,
    storeId: "store_1",
    tenantId: "tenant_1",
    threadId: "thread-1",
    ...overrides,
  };
  const authorizedRequestDigest = manager.ports.digest.digest(
    canonicalExternalBotActionRequest(base),
  );
  const policy = await manager.ports.policyResolver.resolve(base, action);
  const grant = await manager.ports.grantStore.issue({
    action,
    actionClass: policy?.policy.mode === "proposal" ? "proposal" : "effect",
    authorizedRequestDigest,
    channel: base.channel,
    connectionId: base.connectionId,
    expiresAt: new Date(Date.now() + 60_000),
    integrationId: base.integrationId,
    modelVersion: base.modelVersion,
    provider: base.provider,
    storeId: base.storeId,
    tenantId: base.tenantId,
    threadId: base.threadId,
  });
  const unsigned = { ...base, capabilityGrant: grant.token };
  return {
    ...unsigned,
    requestDigest: manager.ports.digest.digest(
      canonicalExternalBotActionRequest(unsigned),
    ),
  };
}

function postAction(
  app: ReturnType<typeof createTestApp>,
  body: unknown,
  token: string,
) {
  return app.request("/api/v1/crm/bot/actions", {
    body: JSON.stringify(body),
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    method: "POST",
  });
}

describe("CRM external bot actions round trip", () => {
  it("executes an action end to end with the configured Bearer token", async () => {
    const { app, configuration, manager } = await createBotApp();
    const request = await signedActionRequest(manager, configuration.id);

    const response = await postAction(app, request, apiToken);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      actionId: expect.any(String),
      status: "completed",
    });
  });

  it("rejects a wrong Bearer token with 401 before touching the grant", async () => {
    const { app, configuration, manager } = await createBotApp();
    const request = await signedActionRequest(manager, configuration.id);

    const response = await postAction(
      app,
      request,
      "wrong-token-wrong-token-wrong-32",
    );

    expect(response.status).toBe(401);
    await expectApiError(response, {
      code: "CRM_BOT_UNAUTHORIZED",
      message: "Bot credential is invalid.",
    });
  });

  it("rejects a valid token used against another store scope", async () => {
    const { app, configuration, manager } = await createBotApp();
    const request = await signedActionRequest(manager, configuration.id, {
      storeId: "store_other",
    });

    const response = await postAction(app, request, apiToken);

    expect(response.status).toBe(403);
    await expectApiError(response, {
      code: "CRM_BOT_SCOPE_MISMATCH",
      message: "Bot action scope does not match its credential.",
    });
  });

  it("rejects requests after the API token is cleared", async () => {
    const { app, configuration, manager } = await createBotApp();
    const cleared = await app.request("/api/v1/crm/bot/configuration", {
      body: JSON.stringify({ apiToken: null }),
      method: "PATCH",
    });
    expect(cleared.status).toBe(200);
    const request = await signedActionRequest(manager, configuration.id);

    const response = await postAction(app, request, apiToken);

    expect(response.status).toBe(401);
    await expectApiError(response, {
      code: "CRM_BOT_UNAUTHORIZED",
      message: "Bot credential is invalid.",
    });
  });

  it("replays the same idempotent request without re-executing", async () => {
    const { app, configuration, manager } = await createBotApp();
    const request = await signedActionRequest(manager, configuration.id);

    const first = await postAction(app, request, apiToken);
    const replay = await postAction(app, request, apiToken);

    expect(first.status).toBe(200);
    const firstBody = (await first.json()) as { actionId: string };
    expect(replay.status).toBe(200);
    await expect(replay.json()).resolves.toMatchObject({
      actionId: firstBody.actionId,
    });
  });
});
