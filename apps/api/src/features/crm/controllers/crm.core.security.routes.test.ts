import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createMemoryCrmCoreRepository } from "../../../domains/crm/testSupportCore.js";
import { handleCrmCore } from "./crm.core.errors.js";
import { registerCrmCoreRoutes } from "./crm.core.routes.js";

describe("CRM core security route contract", () => {
  it("keeps reads tenant/store scoped and updates CAS protected", async () => {
    const repository = createMemoryCrmCoreRepository();
    const own = await repository.create({
      data: contact("Own"),
      resource: "contacts",
      scope: scope(),
    });
    await repository.create({
      data: contact("Foreign"),
      resource: "contacts",
      scope: { storeId: "store-b", tenantId: "tenant-a" },
    });
    const app = appFor(repository, ["crm.access", "crm.manage"]);

    const list = await json<{ contacts: Array<{ displayName: string }> }>(
      await app.request("/contacts"),
    );
    expect(list.contacts.map((item) => item.displayName)).toEqual(["Own"]);

    const changed = await app.request(`/contacts/${own.id}`, {
      body: JSON.stringify({
        expectedRevision: own.revision,
        patch: { displayName: "Changed" },
      }),
      headers: jsonHeaders,
      method: "PATCH",
    });
    expect(changed.status).toBe(200);
    const stale = await app.request(`/contacts/${own.id}`, {
      body: JSON.stringify({
        expectedRevision: own.revision,
        patch: { displayName: "Stale" },
      }),
      headers: jsonHeaders,
      method: "PATCH",
    });
    expect(stale.status).toBe(409);
  });

  it("rejects generic patches for server-owned relationship fields", async () => {
    const repository = createMemoryCrmCoreRepository();
    const row = await repository.create({
      data: contact("Contact"),
      resource: "contacts",
      scope: scope(),
    });
    const response = await appFor(repository, [
      "crm.access",
      "crm.manage",
    ]).request(`/contacts/${row.id}`, {
      body: JSON.stringify({
        expectedRevision: row.revision,
        patch: { mergedIntoContactId: crypto.randomUUID() },
      }),
      headers: jsonHeaders,
      method: "PATCH",
    });
    expect(response.status).toBe(400);
  });

  it("reserves merge and unmerge for their dedicated permission", async () => {
    const repository = createMemoryCrmCoreRepository();
    const source = await repository.create({
      data: contact("Source"),
      resource: "contacts",
      scope: scope(),
    });
    const target = await repository.create({
      data: contact("Target"),
      resource: "contacts",
      scope: scope(),
    });
    const payload = {
      expectedRevision: source.revision,
      targetContactId: target.id,
    };
    const manager = appFor(repository, ["crm.access", "crm.manage"]);
    expect(
      (
        await manager.request(`/contacts/${source.id}/merge`, {
          body: JSON.stringify(payload),
          headers: jsonHeaders,
          method: "POST",
        })
      ).status,
    ).toBe(403);
    const authorized = appFor(repository, ["crm.access", "crm.contact.merge"]);
    const mergedResponse = await authorized.request(
      `/contacts/${source.id}/merge`,
      {
        body: JSON.stringify(payload),
        headers: jsonHeaders,
        method: "POST",
      },
    );
    expect(mergedResponse.status).toBe(200);
    const merged = await json<{ revision: number }>(mergedResponse);
    expect(
      (
        await authorized.request(`/contacts/${source.id}/unmerge`, {
          body: JSON.stringify({ expectedRevision: merged.revision }),
          headers: jsonHeaders,
          method: "POST",
        })
      ).status,
    ).toBe(200);
  });

  it("requires evidence and dedicated authority to verify identities", async () => {
    const repository = createMemoryCrmCoreRepository();
    const person = await repository.create({
      data: contact("Person"),
      resource: "contacts",
      scope: scope(),
    });
    const manager = appFor(repository, ["crm.access", "crm.manage"]);
    const forged = await manager.request("/contact-identities", {
      body: JSON.stringify({
        contactId: person.id,
        kind: "email",
        value: "person@example.com",
        verification: "verified",
      }),
      headers: jsonHeaders,
      method: "POST",
    });
    expect(forged.status).toBe(400);

    const createdResponse = await manager.request("/contact-identities", {
      body: JSON.stringify({
        contactId: person.id,
        kind: "email",
        value: "person@example.com",
      }),
      headers: jsonHeaders,
      method: "POST",
    });
    expect(createdResponse.status).toBe(201);
    const identity = await json<{ id: string; revision: number }>(
      createdResponse,
    );
    const payload = {
      contactId: person.id,
      evidence: "operator-confirmation-reference",
      expectedRevision: identity.revision,
      occurredAt: "2026-08-12T12:00:00.000Z",
      source: "crm_operator",
    };
    expect(
      (
        await manager.request(`/contact-identities/${identity.id}/verify`, {
          body: JSON.stringify(payload),
          headers: jsonHeaders,
          method: "POST",
        })
      ).status,
    ).toBe(403);

    const authorized = appFor(repository, [
      "crm.access",
      "crm.manage",
      "crm.contact_identity.verify",
    ]);
    const verifiedResponse = await authorized.request(
      `/contact-identities/${identity.id}/verify`,
      {
        body: JSON.stringify(payload),
        headers: jsonHeaders,
        method: "POST",
      },
    );
    expect(verifiedResponse.status).toBe(200);
    await expect(json(verifiedResponse)).resolves.toMatchObject({
      contactId: person.id,
      verification: "verified",
    });
  });
});

const jsonHeaders = { "content-type": "application/json" };

function appFor(
  repository: ReturnType<typeof createMemoryCrmCoreRepository>,
  permissions: string[],
) {
  const app = new Hono();
  registerCrmCoreRoutes(app, {
    createContext: async () =>
      createServiceContext({
        actor: { id: "user-a", kind: "user" },
        entitlements: ["crm"],
        permissions,
        request: { requestId: "request-a" },
        ...scope(),
      }),
    handleCrm: handleCrmCore,
    repository,
  });
  return app;
}

function contact(displayName: string) {
  return { disputed: false, displayName, mergedIntoContactId: null };
}

function scope() {
  return { storeId: "store-a", tenantId: "tenant-a" };
}

async function json<T = Record<string, unknown>>(response: Response) {
  return (await response.json()) as T;
}
