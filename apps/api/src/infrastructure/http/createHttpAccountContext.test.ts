import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountProvisioningProviderError } from "../../domains/identity/services/AccountProvisioningService/serviceSupport.js";
import { createHttpAccountContext } from "./createHttpAccountContext.js";

describe("createHttpAccountContext", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("maps Clerk profile provider failures to provider errors", async () => {
    vi.stubEnv("APP_ENV", "production");
    const context = await captureContext(
      new Request("https://api.local/api/v1/session/bootstrap", {
        headers: { authorization: "Bearer session_token" },
      }),
    );
    const identityVerifier = {
      verify: vi.fn(async () => ({ clerkUserId: "clerk_1" })),
    };
    const profileProvider = {
      getProfile: vi.fn(async () => {
        throw new Error("Clerk unavailable");
      }),
    };

    await expect(
      createHttpAccountContext(context, { identityVerifier, profileProvider }),
    ).rejects.toThrow(AccountProvisioningProviderError);
  });
});

async function captureContext(request: Request) {
  let captured: unknown;
  const app = new Hono();
  app.all("*", (context) => {
    captured = context;
    return context.json({ ok: true });
  });

  await app.request(request);
  return captured as Parameters<typeof createHttpAccountContext>[0];
}
