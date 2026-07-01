import { describe, expect, it } from "vitest";
import { createProductCrmAuthFromEnv } from "./runtimeApi";

describe("CRM runtime API auth", () => {
  it("uses Clerk session tokens when available", () => {
    expect(
      createProductCrmAuthFromEnv("real-clerk-token", {
        VITE_DEV_CLERK_USER_ID: "clerk_1",
        VITE_DEV_STORE_SLUG: "loja",
      }),
    ).toMatchObject({
      accessToken: "real-clerk-token",
      clerkUserId: "clerk_1",
      storeSlug: "loja",
    });
  });

  it("does not invent a deterministic local token for dev", () => {
    expect(
      createProductCrmAuthFromEnv(null, {
        VITE_DEV_CLERK_USER_ID: "clerk_local",
        VITE_DEV_STORE_SLUG: "test-store",
      }),
    ).toEqual({
      clerkUserId: "clerk_local",
      storeSlug: "test-store",
    });
  });

  it("does not invent a token without an explicit session token", () => {
    expect(
      createProductCrmAuthFromEnv(null, {
        VITE_DEV_CLERK_USER_ID: "clerk_local",
        VITE_DEV_STORE_SLUG: "test-store",
      }),
    ).toEqual({
      clerkUserId: "clerk_local",
      storeSlug: "test-store",
    });
  });

  it("accepts an explicit dev session token for production preview QA", () => {
    expect(
      createProductCrmAuthFromEnv(null, {
        VITE_DEV_CLERK_SESSION_TOKEN: "local-preview-token",
        VITE_DEV_CLERK_USER_ID: "clerk_local",
        VITE_DEV_STORE_SLUG: "test-store",
      }),
    ).toMatchObject({
      accessToken: "local-preview-token",
      clerkUserId: "clerk_local",
      storeSlug: "test-store",
    });
  });
});
