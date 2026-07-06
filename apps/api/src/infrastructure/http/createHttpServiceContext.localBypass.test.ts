import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  StoreAccessRecord,
  StoreAccessRepository,
} from "../../domains/identity/ports/storeAccessRepository.js";
import { createHttpServiceContext } from "./createHttpServiceContext.js";

describe("createHttpServiceContext local auth bypass", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("resolves authenticated context from local bypass env", async () => {
    vi.stubEnv("APP_ENV", "local");
    vi.stubEnv("LOCAL_AUTH_BYPASS", "true");
    vi.stubEnv("DEV_CLERK_USER_ID", "clerk_test_user");
    vi.stubEnv("DEV_STORE_SLUG", "test-store");
    const access: StoreAccessRecord = {
      billingManagedBy: "store_owner",
      entitlements: ["crm"],
      overrides: [],
      role: "owner",
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
      userId: "user_1" as never,
    };
    const repository: StoreAccessRepository = {
      findByClerkUserAndStoreSlug: vi.fn(async () => access),
    };
    const context = await captureContext(
      new Request("https://api.local/api/v1/finance/summary", {
        headers: { "x-request-id": "req_1" },
      }),
    );

    const serviceContext = await createHttpServiceContext(context, {
      repository,
    });

    expect(serviceContext.actor).toEqual({
      externalId: "clerk_test_user",
      id: "user_1",
      kind: "user",
    });
    expect(repository.findByClerkUserAndStoreSlug).toHaveBeenCalledWith({
      clerkUserId: "clerk_test_user",
      storeSlug: "test-store",
    });
  });

  it("rejects local bypass when node env is production", async () => {
    vi.stubEnv("APP_ENV", "local");
    vi.stubEnv("LOCAL_AUTH_BYPASS", "true");
    vi.stubEnv("NODE_ENV", "production");
    const context = await captureContext(
      new Request("https://api.local/api/v1/finance/summary", {
        headers: { "x-request-id": "req_1" },
      }),
    );

    const serviceContext = await createHttpServiceContext(context);

    expect(serviceContext.actor).toEqual({ id: "public", kind: "public" });
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
  return captured as Parameters<typeof createHttpServiceContext>[0];
}
