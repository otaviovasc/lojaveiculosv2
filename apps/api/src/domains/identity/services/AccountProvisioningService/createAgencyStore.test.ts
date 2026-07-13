import { describe, expect, it, vi } from "vitest";
import type { StoreId, TenantId, UserId } from "@lojaveiculosv2/shared";
import type {
  AccountProvisioningRepository,
  ClerkUserProfile,
} from "../../ports/accountProvisioningRepository.js";
import { AuthorizationError } from "../../../../shared/authorization.js";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { createAgencyStore } from "./createAgencyStore.js";
import {
  AccountProvisioningPolicyError,
  AccountProvisioningScopeError,
} from "./serviceSupport.js";

const actorId = "user_agency" as UserId;
const storeId = "store_created" as StoreId;
const tenantId = "tenant_target" as TenantId;
const otherTenantId = "tenant_other" as TenantId;

const profile: ClerkUserProfile = {
  clerkUserId: "clerk_agency",
  email: "agency@example.com",
  emailVerified: true,
  name: "Agency User",
};

const input = {
  publicSlug: "Auto Prime",
  storeLegalName: "Auto Prime Ltda",
  storeTradingName: " Auto Prime ",
  tenantId,
};

describe("createAgencyStore", () => {
  it("creates a store only inside the authorized tenant and records critical audit", async () => {
    const repository = createRepository();
    const record = vi.fn<AuditRecord>(async () => undefined);

    const result = await createAgencyStore(
      createContext({ audit: { record } }),
      profile,
      input,
      createPorts(repository),
    );

    expect(repository.hasActiveTenantRole).toHaveBeenCalledWith({
      role: "agency",
      tenantId,
      userId: actorId,
    });
    expect(repository.createAgencyStore).toHaveBeenCalledWith({
      actorUserId: actorId,
      publicSlug: "auto-prime",
      storeLegalName: "Auto Prime Ltda",
      storeTradingName: "Auto Prime",
      tenantId,
    });
    expect(record).toHaveBeenCalledOnce();
    expect(record.mock.calls[0]?.[0]).toMatchObject({
      action: "identity.agency_store.create",
      actor: { id: actorId },
      criticality: "critical",
      metadata: {
        catalogVersion: "2026-07-v1",
        entitlementEndsAt: "2026-08-11T00:00:00.000Z",
        entitlements: ["crm", "subdomain"],
      },
      storeId,
      tenantId,
    });
    expect(result).toEqual(expect.objectContaining({ storeId, tenantId }));
  });

  it("rejects a tenant outside the explicit service context before repository access", async () => {
    const repository = createRepository({ platformAdmin: true });

    await expect(
      createAgencyStore(
        createContext({ tenantId: otherTenantId }),
        profile,
        input,
        createPorts(repository),
      ),
    ).rejects.toBeInstanceOf(AccountProvisioningScopeError);

    expect(repository.ensureUser).not.toHaveBeenCalled();
    expect(repository.hasActiveTenantRole).not.toHaveBeenCalled();
    expect(repository.createAgencyStore).not.toHaveBeenCalled();
  });

  it("enforces store.manage before repository access", async () => {
    const repository = createRepository();

    await expect(
      createAgencyStore(
        createContext({ permissions: [] }),
        profile,
        input,
        createPorts(repository),
      ),
    ).rejects.toBeInstanceOf(AuthorizationError);

    expect(repository.ensureUser).not.toHaveBeenCalled();
    expect(repository.createAgencyStore).not.toHaveBeenCalled();
  });

  it("does not create for an actor without a target-tenant agency role", async () => {
    const repository = createRepository({ agency: false });
    const record = vi.fn(async () => undefined);

    await expect(
      createAgencyStore(
        createContext({ audit: { record } }),
        profile,
        input,
        createPorts(repository),
      ),
    ).rejects.toBeInstanceOf(AccountProvisioningPolicyError);

    expect(repository.createAgencyStore).not.toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
  });

  it("allows a platform admin when the service context targets the tenant", async () => {
    const repository = createRepository({
      agency: false,
      platformAdmin: true,
    });

    await createAgencyStore(
      createContext(),
      profile,
      input,
      createPorts(repository),
    );

    expect(repository.hasActivePlatformAdmin).toHaveBeenCalledWith(actorId);
    expect(repository.createAgencyStore).toHaveBeenCalledOnce();
  });

  it("fails closed when the critical audit event cannot be persisted", async () => {
    const repository = createRepository();

    await expect(
      createAgencyStore(
        createContext({
          audit: {
            record: vi.fn(async () => {
              throw new Error("audit unavailable");
            }),
          },
        }),
        profile,
        input,
        createPorts(repository),
      ),
    ).rejects.toThrow("audit unavailable");

    expect(repository.createAgencyStore).toHaveBeenCalledOnce();
  });
});

function createContext(
  options: {
    audit?: Parameters<typeof createServiceContext>[0]["audit"];
    permissions?: Parameters<typeof createServiceContext>[0]["permissions"];
    tenantId?: TenantId;
  } = {},
) {
  return createServiceContext({
    actor: { externalId: profile.clerkUserId, id: actorId, kind: "user" },
    ...(options.audit ? { audit: options.audit } : {}),
    permissions: options.permissions ?? ["store.manage"],
    request: { requestId: "req_agency_store" },
    tenantId: options.tenantId ?? tenantId,
  });
}

function createPorts(repository: ReturnType<typeof createRepository>) {
  return {
    accountProvisioningRepository: repository,
    invitationSender: {
      send: vi.fn(async () => ({ clerkInvitationId: null })),
    },
  };
}

function createRepository(
  options: { agency?: boolean; platformAdmin?: boolean } = {},
) {
  return {
    canCreateOwnerStore: vi.fn(async () => false),
    createAgency: vi.fn(async () => unsupported()),
    createAgencyStore: vi.fn<
      AccountProvisioningRepository["createAgencyStore"]
    >(async (creation) => ({
      catalogVersion: "2026-07-v1",
      entitlementEndsAt: "2026-08-11T00:00:00.000Z",
      entitlements: ["crm", "subdomain"],
      role: "agency" as const,
      storeId,
      storeName: creation.storeTradingName,
      storeSlug: creation.publicSlug,
      tenantId: creation.tenantId,
      tenantName: "Target Agency",
    })),
    createOwnerStore: vi.fn(async () => unsupported()),
    createStoreInvitation: vi.fn(async () => unsupported()),
    ensureUser: vi.fn(async () => ({
      clerkUserId: profile.clerkUserId,
      email: profile.email,
      id: actorId,
      name: profile.name,
    })),
    findActiveStoreRole: vi.fn(async () => null),
    findInvitationById: vi.fn(async () => null),
    findSessionBootstrap: vi.fn(async () => unsupported()),
    hasActivePlatformAdmin: vi.fn(async () => options.platformAdmin ?? false),
    hasActiveTenantRole: vi.fn<
      AccountProvisioningRepository["hasActiveTenantRole"]
    >(async (scope) => (options.agency ?? true) && scope.tenantId === tenantId),
    hasStorePermission: vi.fn(async () => false),
    markInvitationSendFailed: vi.fn(async () => false),
    markInvitationSent: vi.fn(async () => false),
  } satisfies AccountProvisioningRepository;
}

function unsupported(): never {
  throw new Error("Unexpected account provisioning repository call");
}

type AuditRecord = NonNullable<
  Parameters<typeof createServiceContext>[0]["audit"]
>["record"];
