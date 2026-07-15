import { vi } from "vitest";
import type { RoleKey, TenantId } from "@lojaveiculosv2/shared";
import type {
  AccountProvisioningRepository,
  InvitationSender,
} from "../../../domains/identity/ports/accountProvisioningRepository.js";
import { createServiceContext } from "../../../shared/serviceContext.js";
import { createAccountProvisioningFeature } from "./accountProvisioning.controller.js";
import { createAccountProvisioningServices } from "./accountProvisioningServices.js";

export const profile = {
  clerkUserId: "clerk_1",
  email: "owner@example.com",
  emailVerified: true,
  name: "Owner",
};
export const invitationId = "11111111-1111-4111-8111-111111111111";
export const agencyInvitationId = "22222222-2222-4222-8222-222222222222";
export const agencyTenantId = "33333333-3333-4333-8333-333333333333";

export function createFeature(
  repository: AccountProvisioningRepository,
  invitationSender: InvitationSender = {
    send: vi.fn(async () => ({ clerkInvitationId: null })),
  },
) {
  return createAccountProvisioningFeature({
    accountContextFactory: async (_context, scope) => ({
      profile,
      serviceContext: createContext({
        storeId: null,
        tenantId: scope?.tenantId ?? null,
      }),
    }),
    services: createAccountProvisioningServices({
      invitationSender,
      repository,
    }),
    storeContextFactory: async () =>
      createContext({ storeId: "store_1", tenantId: "tenant_1" }),
  });
}

export function createRepository(
  input: {
    platformAdmin?: boolean;
    storeRole?: RoleKey | null;
    tenantAgency?: boolean;
  } = {},
) {
  const platformAdmin = input.platformAdmin ?? true;
  const storeRole = input.storeRole ?? "owner";
  const tenantAgency = input.tenantAgency ?? true;
  return {
    createAgency: vi.fn<AccountProvisioningRepository["createAgency"]>(
      async () => ({
        invitationId: null,
        invitationStatus: null,
        tenantId: "tenant_agency" as never,
        tenantName: "Agency One",
        tenantSlug: "agency-one",
      }),
    ),
    createAgencyStore: vi.fn<
      AccountProvisioningRepository["createAgencyStore"]
    >(async (creation) => storeRecord("agency", creation.tenantId)),
    createOwnerStore: vi.fn(async () => storeRecord("owner")),
    createStoreInvitation: vi.fn(async () => ({
      email: "seller@example.com",
      id: invitationId,
      role: "salesman" as const,
      status: "pending" as const,
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
    })),
    ensureUser: vi.fn(async () => ({
      clerkUserId: "clerk_1",
      email: "owner@example.com",
      id: "user_1" as never,
      name: "Owner",
    })),
    findInvitationById: vi.fn(async () => ({
      email: "seller@example.com",
      id: invitationId,
      role: "salesman" as const,
      status: "send_failed" as const,
      storeId: "store_1" as never,
      tenantId: "tenant_1" as never,
    })),
    findSessionBootstrap: vi.fn(async () => ({
      acceptedInvitations: [],
      defaultStore: null,
      needsOnboarding: true,
      platformAdmin,
      stores: [],
      tenantMemberships: [],
      user: {
        clerkUserId: "clerk_1",
        email: "owner@example.com",
        id: "user_1" as never,
        name: "Owner",
      },
    })),
    canCreateOwnerStore: vi.fn(async () => true),
    findActiveStoreRole: vi.fn(async () => storeRole),
    hasActivePlatformAdmin: vi.fn(async () => platformAdmin),
    hasActiveTenantRole: vi.fn(async () => tenantAgency),
    hasStorePermission: vi.fn(async () => true),
    markInvitationSendFailed: vi.fn(async () => true),
    markInvitationSent: vi.fn(async () => true),
  } satisfies AccountProvisioningRepository;
}

function createContext(input: {
  storeId: string | null;
  tenantId: string | null;
}) {
  return createServiceContext({
    actor: { externalId: "clerk_1", id: "user_1", kind: "user" },
    audit: { record: vi.fn(async () => undefined) },
    permissions: [
      "identity.owner_store.create",
      "identity.session.bootstrap",
      "store.manage",
      "tenant.manage",
      "users.manage",
    ],
    request: { requestId: "req_1" },
    storeId: input.storeId,
    tenantId: input.tenantId,
  });
}

function storeRecord(
  role: "agency" | "owner",
  tenantId: TenantId = "tenant_1" as TenantId,
) {
  return {
    billingManagedBy: role === "agency" ? "agency" : "store_owner",
    catalogVersion: "2026-07-v1",
    entitlementEndsAt: "2026-08-11T00:00:00.000Z",
    entitlements: [
      "subdomain",
      "automation",
      "analytics",
      "compliance",
    ] as const,
    role,
    storeId: "store_1" as never,
    storeName: "Auto Prime",
    storeSlug: "auto-prime",
    tenantId,
    tenantName: "Auto Prime",
  };
}
