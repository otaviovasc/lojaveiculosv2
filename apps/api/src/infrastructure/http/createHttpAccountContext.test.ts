import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AccountProvisioningRepository } from "../../domains/identity/ports/accountProvisioningRepository.js";
import type {
  ClerkUserProfile,
  IdentityUserSummary,
} from "../../domains/identity/ports/accountProvisioningRepository.js";
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

  it("grants agency analytics and Credere management only to authorities", async () => {
    const context = await captureContext(
      new Request("https://api.local/api/v1/agency/tenants/tenant_1", {
        headers: { "x-clerk-user-id": "clerk_agency" },
      }),
    );

    const agency = await createHttpAccountContext(context, {
      repository: createRepository({ agency: true }),
      tenantId: "tenant_1",
    });
    const platform = await createHttpAccountContext(context, {
      repository: createRepository({ platformAdmin: true }),
      tenantId: "tenant_1",
    });
    const regular = await createHttpAccountContext(context, {
      repository: createRepository(),
      tenantId: "tenant_1",
    });

    expect(agency.serviceContext.permissions).toContain(
      "financing.connection.manage",
    );
    expect(agency.serviceContext.permissions).toContain("analytics.read");
    expect(platform.serviceContext.permissions).toContain(
      "financing.connection.manage",
    );
    expect(regular.serviceContext.permissions).not.toContain(
      "financing.connection.manage",
    );
    expect(regular.serviceContext.permissions).not.toContain("analytics.read");
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

function createRepository(
  options: {
    agency?: boolean;
    platformAdmin?: boolean;
  } = {},
): AccountProvisioningRepository {
  return {
    canCreateOwnerStore: vi.fn(async () => false),
    createAgency: vi.fn(),
    createAgencyStore: vi.fn(),
    createOwnerStore: vi.fn(),
    createStoreInvitation: vi.fn(),
    ensureUser: vi.fn(
      async (profile: ClerkUserProfile): Promise<IdentityUserSummary> => ({
        clerkUserId: profile.clerkUserId,
        email: profile.email,
        id: "user_1" as IdentityUserSummary["id"],
        name: profile.name,
      }),
    ),
    findActiveStoreRole: vi.fn(async () => null),
    findInvitationById: vi.fn(async () => null),
    findSessionBootstrap: vi.fn(),
    hasActivePlatformAdmin: vi.fn(async () => Boolean(options.platformAdmin)),
    hasActiveTenantRole: vi.fn(async () => Boolean(options.agency)),
    hasStorePermission: vi.fn(async () => false),
    markInvitationSendFailed: vi.fn(async () => true),
    markInvitationSent: vi.fn(async () => true),
  };
}
