import type { PermissionKey } from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createRoleServices } from "./roleServices.js";
import { createRolesFeature } from "./roles.controller.js";

const workflowPermissions = [
  "finance.auto_entries.manage",
  "lead.update",
  "sale.draft",
] satisfies PermissionKey[];

describe("role member options controller", () => {
  it.each(workflowPermissions)(
    "allows the %s workflow without users.manage",
    async (permission) => {
      const feature = createFeature([permission]);

      const response = await feature.request("/member-options");

      expect(response.status).toBe(200);
      const body = (await response.json()) as {
        members: Record<string, unknown>[];
      };
      expect(body.members).not.toHaveLength(0);
      expect(Object.keys(body.members[0] ?? {}).sort()).toEqual([
        "email",
        "name",
        "role",
        "userId",
      ]);
    },
  );

  it("rejects callers without a seller-scoped workflow permission", async () => {
    const feature = createFeature(["inventory.read"]);

    const response = await feature.request("/member-options");

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ code: "AUTHORIZATION_DENIED" }),
    );
  });
});

function createFeature(permissions: readonly PermissionKey[]) {
  return createRolesFeature({
    contextFactory: async () =>
      createServiceContext({
        actor: { id: "user_1", kind: "user" },
        permissions,
        request: { requestId: "req_member_options" },
        storeId: "store_1",
        tenantId: "tenant_1",
      }),
    services: createRoleServices(),
  });
}
