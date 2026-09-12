import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createMemoryCrmCoreRepository } from "../../../domains/crm/testSupportCore.js";
import { handleCrmCore } from "./crm.core.errors.js";
import { registerCrmCoreRoutes } from "./crm.core.routes.js";

describe("CRM core conversation route contract", () => {
  it("allows Instagram without phone and requires verified phone plus opt-in for WhatsApp", async () => {
    const repository = createMemoryCrmCoreRepository();
    const person = await repository.create({
      data: {
        disputed: false,
        displayName: "Person",
        mergedIntoContactId: null,
      },
      resource: "contacts",
      scope: scope(),
    });
    const instagram = await repository.create({
      data: connection("instagram", "meta_cloud"),
      resource: "connections",
      scope: scope(),
    });
    const whatsapp = await repository.create({
      data: connection("whatsapp", "zapi"),
      resource: "connections",
      scope: scope(),
    });
    const app = appFor(repository);

    const instagramResponse = await start(app, instagram.id, person.id);
    expect(instagramResponse.status).toBe(201);
    await expect(json(instagramResponse)).resolves.toMatchObject({
      channel: "instagram",
      transportProvider: "meta_cloud",
    });
    expect((await start(app, whatsapp.id, person.id)).status).toBe(409);

    const phone = await repository.create({
      data: {
        candidateContactIds: [],
        contactId: person.id,
        kind: "phone",
        normalizedValue: "+5511999999999",
        verification: "verified",
      },
      resource: "contact-identities",
      scope: scope(),
    });
    await repository.create({
      data: {
        channel: "whatsapp",
        contactId: person.id,
        evidence: "receipt-reference",
        identityId: phone.id,
        occurredAt: new Date("2026-08-12T12:00:00.000Z"),
        policyVersion: "2026-08",
        purpose: "commercial_messaging",
        source: "manual",
        status: "opt_in",
      },
      resource: "consents",
      scope: scope(),
    });
    const whatsappResponse = await start(app, whatsapp.id, person.id);
    expect(whatsappResponse.status).toBe(201);
    await expect(json(whatsappResponse)).resolves.toMatchObject({
      channel: "whatsapp",
      transportProvider: "zapi",
    });
    await repository.create({
      data: {
        channel: "whatsapp",
        contactId: person.id,
        evidence: "withdrawal-reference",
        identityId: phone.id,
        occurredAt: new Date("2026-08-12T13:00:00.000Z"),
        policyVersion: "2026-08",
        purpose: "commercial_messaging",
        source: "manual",
        status: "opt_out",
      },
      resource: "consents",
      scope: scope(),
    });
    expect((await start(app, whatsapp.id, person.id)).status).toBe(409);
  });

  it("reopens inbound without changing pipeline, provider, or human attendance", async () => {
    const repository = createMemoryCrmCoreRepository();
    const person = await repository.create({
      data: {
        disputed: false,
        displayName: "Person",
        mergedIntoContactId: null,
      },
      resource: "contacts",
      scope: scope(),
    });
    const instagram = await repository.create({
      data: connection("instagram", "meta_cloud"),
      resource: "connections",
      scope: scope(),
    });
    const app = appFor(repository);
    const started = await json<{
      id: string;
      revision: number;
    }>(await start(app, instagram.id, person.id));
    const resolved = await repository.update({
      ...scope(),
      expectedRevision: started.revision,
      id: started.id,
      patch: {
        attendanceState: "human_active",
        pipelineId: "pipeline-a",
        pipelineStageId: "stage-a",
        threadState: "resolved",
      },
      resource: "conversations",
    });
    if (!resolved) throw new Error("conversation missing");

    const response = await app.request(
      `/conversations/${resolved.id}/inbound`,
      {
        body: JSON.stringify({ expectedRevision: resolved.revision }),
        headers: { "content-type": "application/json" },
        method: "POST",
      },
    );
    expect(response.status).toBe(200);
    await expect(json(response)).resolves.toMatchObject({
      attendanceState: "human_active",
      pipelineId: "pipeline-a",
      pipelineStageId: "stage-a",
      threadState: "open",
      transportProvider: "meta_cloud",
      unreadCount: 1,
    });
  });
});

function appFor(repository: ReturnType<typeof createMemoryCrmCoreRepository>) {
  const app = new Hono();
  registerCrmCoreRoutes(app, {
    createContext: async () =>
      createServiceContext({
        actor: { id: "user-a", kind: "user" },
        entitlements: ["crm"],
        permissions: ["crm.access", "crm.manage"],
        request: { requestId: "request-a" },
        ...scope(),
      }),
    handleCrm: handleCrmCore,
    repository,
  });
  return app;
}

function connection(
  channel: "instagram" | "whatsapp",
  transportProvider: "meta_cloud" | "zapi",
) {
  return {
    capabilities: { inbound: true, outbound: true, templates: false },
    channel,
    credentialBroker:
      transportProvider === "zapi"
        ? ("direct" as const)
        : ("composio" as const),
    degraded: false,
    errorCode: null,
    operational: true,
    transportProvider,
  };
}

function scope() {
  return { storeId: "store-a", tenantId: "tenant-a" };
}

function start(app: Hono, connectionId: string, contactId: string) {
  return app.request("/conversations", {
    body: JSON.stringify({ connectionId, contactId }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

async function json<T = Record<string, unknown>>(response: Response) {
  return (await response.json()) as T;
}
