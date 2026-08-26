import { describe, expect, it } from "vitest";
import { createDrizzleStoreAccessRepository } from "./drizzleStoreAccessRepository.js";
import {
  createFakeStoreAccessDb,
  createStoreAccessRows,
} from "./drizzleStoreAccessRepository.testSupport.js";

describe("Drizzle agency tenant store access", () => {
  it("scopes an active agency member to the requested same-tenant store", async () => {
    const access = await findAgencyAccess(createAgencyRows());

    expect(access).toMatchObject({
      accessOrigin: "tenant_agency_fallback",
      billingManagedBy: "agency",
      entitlements: ["crm", "storefront"],
      overrides: [],
      role: "agency",
      storeId: "store_1",
      tenantId: "tenant_1",
      userId: "user_1",
    });
  });

  it.each(["salesman", "owner"] as const)(
    "lets active agency authority dominate a direct %s membership",
    async (directRole) => {
      const rows = createAgencyRows({
        memberships: [directMembership(directRole)],
        roleTemplates: [
          { id: "role_agency", roleKey: "agency" },
          { id: `role_${directRole}`, roleKey: directRole },
        ],
      });

      await expect(findAgencyAccess(rows)).resolves.toMatchObject({
        accessOrigin: "tenant_agency_fallback",
        role: "agency",
        storeId: "store_1",
        tenantId: "tenant_1",
      });
    },
  );

  it.each(["salesman", "owner"] as const)(
    "keeps a direct %s membership when agency authority is inactive",
    async (directRole) => {
      const rows = createAgencyRows({
        memberships: [directMembership(directRole)],
        roleTemplates: [
          { id: "role_agency", roleKey: "agency" },
          { id: `role_${directRole}`, roleKey: directRole },
        ],
        tenantMemberships: [
          {
            roleTemplateId: "role_agency",
            status: "suspended",
            tenantId: "tenant_1" as never,
            userId: "user_1" as never,
          },
        ],
      });

      await expect(findAgencyAccess(rows)).resolves.toMatchObject({
        accessOrigin: "direct_store_membership",
        role: directRole,
      });
    },
  );

  it.each(["invited", "suspended"] as const)(
    "denies an agency tenant membership with %s status",
    async (status) => {
      const rows = createAgencyRows({
        tenantMemberships: [
          {
            roleTemplateId: "role_agency",
            status,
            tenantId: "tenant_1" as never,
            userId: "user_1" as never,
          },
        ],
      });

      await expect(findAgencyAccess(rows)).resolves.toBeNull();
    },
  );

  it("denies access after the agency tenant membership is removed", async () => {
    await expect(
      findAgencyAccess(createAgencyRows({ tenantMemberships: [] })),
    ).resolves.toBeNull();
  });

  it("does not cross the agency tenant boundary for a store slug", async () => {
    const rows = createAgencyRows({
      stores: [
        {
          deletedAt: null,
          id: "store_2" as never,
          isDeleted: false,
          publicSlug: "other-store",
          tenantId: "tenant_2" as never,
        },
      ],
      tenants: [
        { deletedAt: null, id: "tenant_1" as never, isDeleted: false },
        { deletedAt: null, id: "tenant_2" as never, isDeleted: false },
      ],
    });

    await expect(findAgencyAccess(rows, "other-store")).resolves.toBeNull();
  });

  it("denies a deleted same-tenant store", async () => {
    const rows = createAgencyRows({
      stores: [
        {
          deletedAt: new Date("2026-08-22T00:00:00.000Z"),
          id: "store_1" as never,
          isDeleted: false,
          publicSlug: "demo",
          tenantId: "tenant_1" as never,
        },
      ],
    });

    await expect(findAgencyAccess(rows)).resolves.toBeNull();
  });
});

function createAgencyRows(
  overrides: Parameters<typeof createStoreAccessRows>[0] = {},
) {
  return createStoreAccessRows({
    memberships: [],
    roleTemplates: [{ id: "role_agency", roleKey: "agency" }],
    tenantMemberships: [
      {
        roleTemplateId: "role_agency",
        status: "active",
        tenantId: "tenant_1" as never,
        userId: "user_1" as never,
      },
    ],
    ...overrides,
  });
}

async function findAgencyAccess(
  rows: ReturnType<typeof createStoreAccessRows>,
  storeSlug = "demo",
) {
  return createDrizzleStoreAccessRepository(
    createFakeStoreAccessDb(rows),
  ).findByClerkUserAndStoreSlug({ clerkUserId: "clerk_1", storeSlug });
}

function directMembership(role: "owner" | "salesman") {
  return {
    id: `membership_${role}`,
    roleTemplateId: `role_${role}`,
    status: "active" as const,
    storeId: "store_1" as never,
    tenantId: "tenant_1" as never,
    userId: "user_1" as never,
  };
}
