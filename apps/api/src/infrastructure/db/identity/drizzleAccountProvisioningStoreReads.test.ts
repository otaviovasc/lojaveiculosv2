import { describe, expect, it } from "vitest";
import {
  membershipPermissionOverrides,
  storeEntitlements,
  storeMemberships,
  tenantMemberships,
} from "@lojaveiculosv2/db";
import { allPermissions } from "../../../domains/identity/domain/allPermissions.js";
import type { DrizzleAccountProvisioningClient } from "./drizzleAccountProvisioningSupport.js";
import { listStores } from "./drizzleAccountProvisioningStoreReads.js";

describe("Drizzle account provisioning store reads", () => {
  it("bootstraps every active agency tenant store with full agency permissions", async () => {
    const stores = await listStores(createAgencySessionDb(), "user_1");

    expect(stores).toHaveLength(1);
    expect(stores[0]).toMatchObject({
      billingManagedBy: "agency",
      entitlements: ["crm"],
      role: "agency",
      status: "active",
      storeId: "store_1",
      storeSlug: "store-1",
      tenantId: "tenant_1",
    });
    expect(stores[0]?.effectivePermissions).toEqual([...allPermissions].sort());
  });

  it.each(["salesman", "owner"] as const)(
    "lets active agency authority dominate a direct %s session membership",
    async (directRole) => {
      const [store] = await listStores(
        createAgencySessionDb({ directRole }),
        "user_1",
      );

      expect(store).toMatchObject({
        billingManagedBy: "agency",
        role: "agency",
        storeId: "store_1",
        tenantId: "tenant_1",
      });
      expect(store?.effectivePermissions).toEqual([...allPermissions].sort());
    },
  );

  it.each(["salesman", "owner"] as const)(
    "keeps a direct %s session role when agency authority is inactive",
    async (directRole) => {
      const [store] = await listStores(
        createAgencySessionDb({ agencyActive: false, directRole }),
        "user_1",
      );

      expect(store).toMatchObject({
        billingManagedBy: "store_owner",
        role: directRole,
        storeId: "store_1",
        tenantId: "tenant_1",
      });
    },
  );

  it("does not cap an agency session at one hundred stores", async () => {
    const stores = await listStores(
      createAgencySessionDb({ storeCount: 101 }),
      "user_1",
    );

    expect(stores).toHaveLength(101);
    expect(stores.at(-1)).toMatchObject({
      role: "agency",
      storeId: "store_101",
      tenantId: "tenant_1",
    });
  });
});

type AgencySessionDbOptions = {
  agencyActive?: boolean;
  directRole?: "owner" | "salesman";
  storeCount?: number;
};

function createAgencySessionDb(
  options: AgencySessionDbOptions = {},
): DrizzleAccountProvisioningClient {
  const storeCount = options.storeCount ?? 1;
  const agencyActive = options.agencyActive ?? true;
  const agencyRows = agencyActive ? storeRows(storeCount, "agency") : [];
  const directRows = options.directRole
    ? storeRows(storeCount, options.directRole)
    : [];
  const db = {
    select(selection: Record<string, unknown>) {
      return {
        from(table: unknown) {
          const rows = () => {
            if (table === storeMemberships) return directRows;
            if (table === storeEntitlements) {
              return [{ entitlement: "crm" }];
            }
            if (table === membershipPermissionOverrides) return [];
            if (table === tenantMemberships && "storeId" in selection) {
              return agencyRows;
            }
            if (table === tenantMemberships && "id" in selection) {
              return agencyActive ? [{ id: "tenant_membership_1" }] : [];
            }
            throw new Error("Unexpected account provisioning store query");
          };
          const builder = {
            innerJoin() {
              return builder;
            },
            limit(count: number) {
              return Promise.resolve(rows().slice(0, count));
            },
            then(resolve: (value: readonly unknown[]) => unknown) {
              return Promise.resolve(rows()).then(resolve);
            },
            where() {
              return builder;
            },
          };
          return builder;
        },
      };
    },
  };
  return db as unknown as DrizzleAccountProvisioningClient;
}

function storeRows(count: number, role: "agency" | "owner" | "salesman") {
  return Array.from({ length: count }, (_, index) => {
    const position = index + 1;
    return {
      membershipId: `membership_${position}`,
      role,
      status: "active",
      storeId: `store_${position}`,
      storeName: `Loja ${position}`,
      storeSlug: `store-${position}`,
      tenantId: "tenant_1",
      tenantName: "Agência Um",
    };
  });
}
