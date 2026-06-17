import { describe, expect, it } from "vitest";
import {
  membershipPermissionOverrides,
  roleTemplates,
  storeEntitlements,
  storeMemberships,
  stores,
  users,
} from "@lojaveiculosv2/db";
import { createDrizzleStoreAccessRepository } from "./drizzleStoreAccessRepository.js";
import {
  createFakeStoreAccessDb,
  createStoreAccessRows,
} from "./drizzleStoreAccessRepository.testSupport.js";

describe("Drizzle store access repository", () => {
  it("resolves access from identity tables", async () => {
    const db = createFakeStoreAccessDb();
    const repository = createDrizzleStoreAccessRepository(db);

    const access = await repository.findByClerkUserAndStoreSlug({
      clerkUserId: "clerk_1",
      storeSlug: "demo",
    });

    expect(access).toEqual({
      entitlements: ["crm", "subdomain"],
      overrides: [
        { allowed: true, permission: "inventory.update_price" },
        { allowed: false, permission: "inventory.create" },
      ],
      role: "salesman",
      storeId: "store_1",
      tenantId: "tenant_1",
      userId: "user_1",
    });
    expect(db.queriedTables).toEqual(
      expect.arrayContaining([
        users,
        stores,
        storeMemberships,
        roleTemplates,
        membershipPermissionOverrides,
        storeEntitlements,
      ]),
    );
  });

  it("returns null when the membership is not active", async () => {
    const rows = createStoreAccessRows({
      memberships: [
        {
          id: "membership_1",
          roleTemplateId: "role_salesman",
          status: "suspended",
          storeId: "store_1" as never,
          tenantId: "tenant_1" as never,
          userId: "user_1" as never,
        },
      ],
    });
    const repository = createDrizzleStoreAccessRepository(
      createFakeStoreAccessDb(rows),
    );

    await expect(
      repository.findByClerkUserAndStoreSlug({
        clerkUserId: "clerk_1",
        storeSlug: "demo",
      }),
    ).resolves.toBeNull();
  });

  it("returns null for soft-deleted users and stores", async () => {
    const repository = createDrizzleStoreAccessRepository(
      createFakeStoreAccessDb({
        stores: [
          {
            deletedAt: new Date("2026-01-01T00:00:00.000Z"),
            id: "store_1" as never,
            isDeleted: true,
            publicSlug: "demo",
            tenantId: "tenant_1" as never,
          },
        ],
      }),
    );

    await expect(
      repository.findByClerkUserAndStoreSlug({
        clerkUserId: "clerk_1",
        storeSlug: "demo",
      }),
    ).resolves.toBeNull();
  });
});
