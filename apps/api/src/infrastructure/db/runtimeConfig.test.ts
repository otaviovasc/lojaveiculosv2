import { describe, expect, it } from "vitest";
import {
  createRuntimeIdentityVerifier,
  resolveClerkInvitationRedirectUrl,
  RuntimeDatabaseConfigError,
} from "./runtimeConfig.js";

describe("runtime Clerk config", () => {
  it("does not pass local wildcard authorized parties to Clerk verifier", () => {
    expect(() =>
      createRuntimeIdentityVerifier({
        APP_ENV: "local",
        CLERK_AUTHORIZED_PARTIES: "*",
        CLERK_SECRET_KEY: "sk_test_fake",
      }),
    ).not.toThrow();
  });

  it("rejects wildcard authorized parties outside local/test", () => {
    expect(() =>
      createRuntimeIdentityVerifier({
        APP_ENV: "production",
        CLERK_AUTHORIZED_PARTIES: "*",
        CLERK_SECRET_KEY: "sk_test_fake",
        NODE_ENV: "production",
      }),
    ).toThrow(RuntimeDatabaseConfigError);
  });

  it("requires authorized parties outside local/test", () => {
    expect(() =>
      createRuntimeIdentityVerifier({
        APP_ENV: "production",
        CLERK_SECRET_KEY: "sk_test_fake",
        NODE_ENV: "production",
      }),
    ).toThrow(RuntimeDatabaseConfigError);
  });

  it("uses the dedicated Clerk invitation redirect URL when configured", () => {
    expect(
      resolveClerkInvitationRedirectUrl({
        CLERK_AFTER_SIGN_UP_URL: "https://legacy.example.com/auth/session",
        CLERK_INVITATION_REDIRECT_URL: "https://app.example.com/auth/session",
        PUBLIC_APP_URL: "https://app.example.com",
      }),
    ).toBe("https://app.example.com/auth/session");
  });

  it("resolves relative Clerk signup redirects against PUBLIC_APP_URL", () => {
    expect(
      resolveClerkInvitationRedirectUrl({
        CLERK_AFTER_SIGN_UP_URL: "/auth/session",
        PUBLIC_APP_URL: "https://app.example.com/",
      }),
    ).toBe("https://app.example.com/auth/session");
  });

  it("falls back to PUBLIC_APP_URL auth session for Clerk invitations", () => {
    expect(
      resolveClerkInvitationRedirectUrl({
        PUBLIC_APP_URL: "http://localhost:5173",
      }),
    ).toBe("http://localhost:5173/auth/session");
  });
});
