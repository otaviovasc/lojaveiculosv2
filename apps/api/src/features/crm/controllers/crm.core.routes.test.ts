import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createMemoryCrmCoreRepository } from "../../../domains/crm/testSupportCore.js";
import { handleCrmCore } from "./crm.core.errors.js";
import { registerCrmCoreRoutes } from "./crm.core.routes.js";

describe("CRM core route contract", () => {
  it("paginates every list contract with stable cursor and projections", async () => {
    const repository = createMemoryCrmCoreRepository();
    for (const displayName of ["A", "B", "C"]) {
      await repository.create({
        data: { disputed: false, displayName, mergedIntoContactId: null },
        resource: "contacts",
        scope: { storeId: "store-a", tenantId: "tenant-a" },
      });
    }
    const app = new Hono();
    registerCrmCoreRoutes(app, {
      createContext: async () =>
        createServiceContext({
          actor: { id: "user-a", kind: "user" },
          entitlements: ["crm"],
          permissions: ["crm.access", "crm.contact.merge", "crm.manage"],
          request: { requestId: "request-a" },
          storeId: "store-a",
          tenantId: "tenant-a",
        }),
      handleCrm: handleCrmCore,
      repository,
    });

    const firstResponse = await app.request("/contacts?limit=2");
    const first = (await firstResponse.json()) as {
      contacts: Array<{ allowedNextActions: string[]; requestId: string }>;
      nextCursor: string | null;
      requestId: string;
    };
    expect(first.contacts).toHaveLength(2);
    expect(first.contacts[0]?.allowedNextActions).toEqual(["update", "merge"]);
    expect(first.contacts[0]?.requestId).toBe("request-a");
    expect(first).toMatchObject({ requestId: "request-a" });
    expect(first.nextCursor).toEqual(expect.any(String));

    const secondResponse = await app.request(
      `/contacts?limit=2&cursor=${encodeURIComponent(first.nextCursor ?? "")}`,
    );
    const second = (await secondResponse.json()) as {
      contacts: unknown[];
      nextCursor: null;
    };
    expect(second.contacts).toHaveLength(1);
    expect(second.nextCursor).toBeNull();
  });

  it("keeps provider connections read-only", async () => {
    const app = new Hono();
    registerCrmCoreRoutes(app, {
      createContext: async () => {
        throw new Error("must not reach context");
      },
      handleCrm: handleCrmCore,
      repository: createMemoryCrmCoreRepository(),
    });
    expect((await app.request("/connections", { method: "POST" })).status).toBe(
      404,
    );
  });
});
