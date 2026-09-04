import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";
import { tenants } from "@lojaveiculosv2/db";
import type { AccountProvisioningRepository } from "../../domains/identity/ports/accountProvisioningRepository.js";
import type {
  ClerkUserProfile,
  IdentityUserSummary,
} from "../../domains/identity/ports/accountProvisioningRepository.js";
import { AccountProvisioningProviderError } from "../../domains/identity/services/AccountProvisioningService/serviceSupport.js";
import { hasActiveTenantRole } from "../db/identity/drizzleAccountProvisioningReads.js";
import type { DrizzleAccountProvisioningClient } from "../db/identity/drizzleAccountProvisioningSupport.js";
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
    expect(platform.serviceContext.permissions).toContain(
      "crm.messaging.support.manage",
    );
    expect(platform.serviceContext.platformAdmin).toBe(true);
    expect(agency.serviceContext.platformAdmin).toBe(false);
    expect(regular.serviceContext.platformAdmin).toBe(false);
    expect(agency.serviceContext.permissions).not.toContain(
      "crm.messaging.support.manage",
    );
    expect(regular.serviceContext.permissions).not.toContain(
      "crm.messaging.support.manage",
    );
    expect(regular.serviceContext.permissions).not.toContain(
      "financing.connection.manage",
    );
    expect(regular.serviceContext.permissions).not.toContain("analytics.read");
  });

  it("does not delegate platform authority to owner or agency accounts", async () => {
    const ownerContext = await captureContext(
      new Request("https://api.local/api/v1/session/bootstrap", {
        headers: { "x-clerk-user-id": "clerk_owner" },
      }),
    );
    const agencyContext = await captureContext(
      new Request("https://api.local/api/v1/agency/tenants/tenant_1", {
        headers: { "x-clerk-user-id": "clerk_agency" },
      }),
    );

    const owner = await createHttpAccountContext(ownerContext, {
      repository: createRepository(),
    });
    const agency = await createHttpAccountContext(agencyContext, {
      repository: createRepository({ agency: true }),
      tenantId: "tenant_1",
    });

    expect(owner.serviceContext.platformAdmin).toBe(false);
    expect(agency.serviceContext.platformAdmin).toBe(false);
    expect(agency.serviceContext.permissions).toContain("billing.manage");
  });

  it("materializes platform authority from an active platform membership", async () => {
    const context = await captureContext(
      new Request("https://api.local/api/v1/internal/platform/health", {
        headers: { "x-clerk-user-id": "clerk_platform_admin" },
      }),
    );

    const repository = createRepository({ platformAdmin: true });
    const account = await createHttpAccountContext(context, { repository });

    expect(account.serviceContext.platformAdmin).toBe(true);
    expect(account.serviceContext.permissions).toContain("audit.read");
    expect(repository.hasActivePlatformAdmin).toHaveBeenCalledWith("user_1");
  });

  it("denies agency account permissions for a soft-deleted tenant", async () => {
    const context = await captureContext(
      new Request("https://api.local/api/v1/agency/tenants/tenant_1", {
        headers: { "x-clerk-user-id": "clerk_agency" },
      }),
    );
    const tenantRoleResolver = vi.fn((input) =>
      hasActiveTenantRole(createSoftDeletedTenantRoleDb(), input),
    );

    const account = await createHttpAccountContext(context, {
      repository: createRepository({ tenantRoleResolver }),
      tenantId: "tenant_1",
    });

    expect(tenantRoleResolver).toHaveBeenCalledWith({
      role: "agency",
      tenantId: "tenant_1",
      userId: "user_1",
    });
    expect(account.serviceContext.permissions).toEqual([
      "identity.session.bootstrap",
    ]);
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
    tenantRoleResolver?: AccountProvisioningRepository["hasActiveTenantRole"];
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
    hasActiveTenantRole:
      options.tenantRoleResolver ?? vi.fn(async () => Boolean(options.agency)),
    hasStorePermission: vi.fn(async () => false),
    markInvitationSendFailed: vi.fn(async () => true),
    markInvitationSent: vi.fn(async () => true),
  };
}

function createSoftDeletedTenantRoleDb(): DrizzleAccountProvisioningClient {
  let hasDeletedAtGuard = false;
  const db = {
    select() {
      return {
        from() {
          const builder = {
            innerJoin() {
              return builder;
            },
            limit() {
              return Promise.resolve(
                hasDeletedAtGuard ? [] : [{ id: "tenant_membership_1" }],
              );
            },
            where(condition: unknown) {
              hasDeletedAtGuard = referencesIsNull(
                condition,
                tenants.deletedAt,
              );
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

function referencesIsNull(value: unknown, column: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const chunks = (value as { queryChunks?: readonly unknown[] }).queryChunks;
  if (!chunks) return false;
  return chunks.some((chunk, index) => {
    if (chunk === column)
      return chunkText(chunks[index + 1]).includes("is null");
    return referencesIsNull(chunk, column);
  });
}

function chunkText(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const content = (value as { value?: unknown }).value;
  return Array.isArray(content) ? content.join("") : "";
}
