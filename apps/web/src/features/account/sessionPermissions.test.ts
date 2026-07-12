// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import type { SessionBootstrap, StoreAccessSummary } from "./apiClient";
import { clearCurrentStoreSlug, persistCurrentStoreSlug } from "./currentStore";
import { readSessionEffectivePermissions } from "./sessionPermissions";

const actorId = "clerk_user";
const statuses = ["active", "invited", "suspended"] as const;
const selectedSlugs = [undefined, "store-a", "store-b", "missing"] as const;
const defaultIndexes = [null, 0, 1] as const;

describe("readSessionEffectivePermissions", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("fails closed without a session or active store", () => {
    const session = createSession([
      createStore("store-a", "invited", ["inventory.read"]),
      createStore("store-b", "suspended", ["users.manage"]),
    ]);

    expect(readSessionEffectivePermissions(null)).toEqual([]);
    expect(readSessionEffectivePermissions(session)).toEqual([]);
  });

  it("fails closed when an invalid runtime payload omits permissions", () => {
    const { effectivePermissions: _, ...malformedStore } = createStore(
      "store-a",
      "active",
      ["inventory.read"],
    );
    const session = createSession(
      [malformedStore as StoreAccessSummary],
      malformedStore as StoreAccessSummary,
    );

    expect(readSessionEffectivePermissions(session)).toEqual([]);
  });

  it("isolates the persisted selection by authenticated actor", () => {
    const first = createStore("store-a", "active", ["inventory.read"]);
    const second = createStore("store-b", "active", ["users.manage"]);
    const session = createSession([first, second], first);
    persistCurrentStoreSlug(second.storeSlug, "another_user");

    expect(readSessionEffectivePermissions(session)).toEqual(
      first.effectivePermissions,
    );
  });

  it("selects permissions deterministically across all store states", () => {
    let checked = 0;
    for (const firstStatus of statuses) {
      for (const secondStatus of statuses) {
        const stores = [
          createStore("store-a", firstStatus, ["permission.store-a"]),
          createStore("store-b", secondStatus, ["permission.store-b"]),
        ];
        for (const selectedSlug of selectedSlugs) {
          for (const defaultIndex of defaultIndexes) {
            localStorage.clear();
            if (selectedSlug) {
              persistCurrentStoreSlug(selectedSlug, actorId);
            } else {
              clearCurrentStoreSlug(actorId);
            }
            const defaultStore =
              defaultIndex === null ? null : stores[defaultIndex];
            const session = createSession(stores, defaultStore);
            const selected = stores.find(
              (store) =>
                store.status === "active" && store.storeSlug === selectedSlug,
            );
            const expected =
              selected ??
              (defaultStore?.status === "active" ? defaultStore : undefined) ??
              stores.find((store) => store.status === "active");

            expect(readSessionEffectivePermissions(session)).toEqual(
              expected?.effectivePermissions ?? [],
            );
            checked += 1;
          }
        }
      }
    }

    expect(checked).toBe(108);
  });

  it("returns the selected store permission set without widening it", () => {
    const permissions = ["inventory.read", "sale.read"] as const;
    const selected = createStore("store-b", "active", permissions);
    const session = createSession(
      [createStore("store-a", "active", ["users.manage"]), selected],
      null,
    );
    persistCurrentStoreSlug(selected.storeSlug, actorId);

    expect(readSessionEffectivePermissions(session)).toBe(permissions);
  });
});

function createSession(
  stores: StoreAccessSummary[],
  defaultStore: StoreAccessSummary | null = null,
): SessionBootstrap {
  return {
    defaultStore,
    needsOnboarding: false,
    platformAdmin: false,
    stores,
    tenantMemberships: [],
    user: {
      clerkUserId: actorId,
      email: "user@example.com",
      id: "user_id",
      name: "User",
    },
  };
}

function createStore(
  storeSlug: string,
  status: StoreAccessSummary["status"],
  effectivePermissions: readonly string[],
): StoreAccessSummary {
  return {
    effectivePermissions,
    role: "owner",
    status,
    storeId: `id-${storeSlug}`,
    storeName: storeSlug,
    storeSlug,
    tenantId: "tenant_id",
    tenantName: "Tenant",
  };
}
