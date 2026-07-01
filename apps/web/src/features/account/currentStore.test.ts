// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  clearCurrentStoreSlug,
  persistCurrentStoreSlug,
  readCurrentStoreSlug,
  readRuntimeStoreSlug,
} from "./currentStore";

describe("current store persistence", () => {
  afterEach(() => {
    localStorage.clear();
    delete (window as Window & ClerkRuntime).Clerk;
  });

  it("scopes the selected store slug by Clerk user", () => {
    persistCurrentStoreSlug("loja-a", "user_a");
    persistCurrentStoreSlug("loja-b", "user_b");

    expect(readCurrentStoreSlug("user_a")).toBe("loja-a");
    expect(readCurrentStoreSlug("user_b")).toBe("loja-b");
  });

  it("does not reuse legacy selected stores when Clerk identifies the user", () => {
    persistCurrentStoreSlug("test-store");
    (window as Window & ClerkRuntime).Clerk = { user: { id: "user_real" } };

    expect(readRuntimeStoreSlug({ VITE_DEV_STORE_SLUG: "test-store" })).toBe(
      undefined,
    );
  });

  it("uses the dev store fallback only with an explicit dev Clerk user", () => {
    expect(readRuntimeStoreSlug({ VITE_DEV_STORE_SLUG: "test-store" })).toBe(
      undefined,
    );
    expect(
      readRuntimeStoreSlug({
        VITE_DEV_CLERK_USER_ID: "clerk_test_user",
        VITE_DEV_STORE_SLUG: "test-store",
      }),
    ).toBe("test-store");
  });

  it("clears scoped and legacy store slugs", () => {
    persistCurrentStoreSlug("legacy-store");
    persistCurrentStoreSlug("user-store", "user_a");

    clearCurrentStoreSlug("user_a");

    expect(readCurrentStoreSlug("user_a")).toBe(undefined);
    expect(readCurrentStoreSlug()).toBe(undefined);
  });
});

type ClerkRuntime = {
  Clerk?: {
    user?: {
      id?: string;
    };
  };
};
