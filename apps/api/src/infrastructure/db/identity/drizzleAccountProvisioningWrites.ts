import { eq } from "drizzle-orm";
import {
  identityInvitations,
  roleTemplates,
  storeEntitlements,
  storeMemberships,
  storeProfiles,
  storePublicSiteSettings,
  stores,
  tenantMemberships,
  tenants,
} from "@lojaveiculosv2/db";
import type { EntitlementKey, RoleKey } from "@lojaveiculosv2/shared";
import {
  AccountProvisioningConflictError,
  type IdentityInvitationRecord,
  type ProvisionedStoreRecord,
  type StoreProfileDraft,
} from "../../../domains/identity/ports/accountProvisioningRepository.js";
import {
  addDays,
  assertNoActiveInvitation,
} from "./drizzleAccountProvisioningInvitations.js";
import type { DrizzleAccountProvisioningClient } from "./drizzleAccountProvisioningSupport.js";

export async function assertSlugsAvailable(
  db: DrizzleAccountProvisioningClient,
  tenantSlug: string,
  storeSlug: string,
) {
  await assertTenantSlugAvailable(db, tenantSlug);
  await assertStoreSlugAvailable(db, storeSlug);
}

export async function assertTenantSlugAvailable(
  db: DrizzleAccountProvisioningClient,
  slug: string,
) {
  const [tenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);
  if (tenant) {
    throw new AccountProvisioningConflictError(
      "Tenant slug is already in use.",
    );
  }
}

export async function assertStoreSlugAvailable(
  db: DrizzleAccountProvisioningClient,
  slug: string,
) {
  const [store] = await db
    .select({ id: stores.id })
    .from(stores)
    .where(eq(stores.publicSlug, slug))
    .limit(1);
  if (store) {
    throw new AccountProvisioningConflictError("Store slug is already in use.");
  }
}

export async function findRoleTemplateId(
  db: DrizzleAccountProvisioningClient,
  role: RoleKey,
) {
  const [template] = await db
    .select({ id: roleTemplates.id })
    .from(roleTemplates)
    .where(eq(roleTemplates.roleKey, role))
    .limit(1);
  if (!template) throw new Error(`Role template not found: ${role}`);
  return template.id;
}

export async function insertTenantMembership(
  db: DrizzleAccountProvisioningClient,
  tenantId: string,
  userId: string,
  roleTemplateId: string,
) {
  await db
    .insert(tenantMemberships)
    .values({ roleTemplateId, tenantId, userId })
    .onConflictDoNothing();
}

export async function insertStoreMembership(
  db: DrizzleAccountProvisioningClient,
  tenantId: string,
  storeId: string,
  userId: string,
  roleTemplateId: string,
) {
  await db
    .insert(storeMemberships)
    .values({ roleTemplateId, storeId, tenantId, userId })
    .onConflictDoNothing();
}

export async function insertStoreDefaults(
  db: DrizzleAccountProvisioningClient,
  tenantId: string,
  storeId: string,
  profile: StoreProfileDraft | undefined,
  billing: {
    catalogVersion: string;
    endsAt: Date | null;
    entitlements: readonly EntitlementKey[];
    startsAt: Date;
    status: "active" | "trialing";
  },
) {
  await Promise.all([
    db
      .insert(storeProfiles)
      .values(toProfile(tenantId, storeId, profile))
      .onConflictDoNothing(),
    db
      .insert(storePublicSiteSettings)
      .values({ isPublished: false, storeId, tenantId })
      .onConflictDoNothing(),
    db
      .insert(storeEntitlements)
      .values(
        billing.entitlements.map((featureKey) =>
          toEntitlement(tenantId, storeId, featureKey, billing),
        ),
      )
      .onConflictDoNothing(),
  ]);
}

export async function insertInvitation(
  db: DrizzleAccountProvisioningClient,
  input: {
    email: string;
    invitedByUserId: string;
    name?: string | null;
    role: RoleKey;
    storeId: string | null;
    tenantId: string;
  },
): Promise<IdentityInvitationRecord> {
  const roleTemplateId = await findRoleTemplateId(db, input.role);
  await assertNoActiveInvitation(db, {
    email: input.email.trim().toLowerCase(),
    roleTemplateId,
    storeId: input.storeId,
    tenantId: input.tenantId,
  });
  const [created] = await db
    .insert(identityInvitations)
    .values({
      email: input.email.trim().toLowerCase(),
      expiresAt: addDays(new Date(), 14),
      invitedByUserId: input.invitedByUserId,
      metadata: { name: input.name ?? null },
      roleTemplateId,
      storeId: input.storeId,
      tenantId: input.tenantId,
    })
    .returning();
  if (!created) throw new Error("Failed to create identity invitation.");
  return {
    email: created.email,
    id: created.id,
    role: input.role,
    status: created.status,
    storeId: created.storeId as never,
    tenantId: created.tenantId as never,
  };
}

export function toProvisionedStore(
  tenant: typeof tenants.$inferSelect,
  store: typeof stores.$inferSelect,
  role: RoleKey,
  billing: {
    catalogVersion: string;
    endsAt: Date | null;
    entitlements: readonly EntitlementKey[];
  },
): ProvisionedStoreRecord {
  return {
    catalogVersion: billing.catalogVersion,
    entitlementEndsAt: billing.endsAt?.toISOString() ?? null,
    entitlements: billing.entitlements,
    role,
    storeId: store.id as never,
    storeName: store.tradingName,
    storeSlug: store.publicSlug,
    tenantId: tenant.id as never,
    tenantName: tenant.tradingName,
  };
}

function toProfile(
  tenantId: string,
  storeId: string,
  profile: StoreProfileDraft | undefined,
) {
  return {
    contactEmail: profile?.contactEmail ?? null,
    contactPhone: profile?.contactPhone ?? null,
    documentNumber: profile?.documentNumber ?? null,
    storeId,
    tenantId,
    whatsappPhone: profile?.whatsappPhone ?? profile?.contactPhone ?? null,
  };
}

function toEntitlement(
  tenantId: string,
  storeId: string,
  featureKey: EntitlementKey,
  billing: {
    catalogVersion: string;
    endsAt: Date | null;
    startsAt: Date;
    status: "active" | "trialing";
  },
) {
  return {
    endsAt: billing.endsAt,
    featureKey,
    metadata: {
      catalogVersion: billing.catalogVersion,
      sourceDetail: "billing_catalog",
    },
    source: "billing_catalog",
    startsAt: billing.startsAt,
    status: billing.status,
    storeId,
    tenantId,
  };
}
