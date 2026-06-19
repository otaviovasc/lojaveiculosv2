import { and, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  storeProfiles,
  storePublicSiteSettings,
  stores,
} from "@lojaveiculosv2/db";
import type * as schema from "@lojaveiculosv2/db";
import type {
  StoreSettingsRepository,
  StoreSettingsSnapshot,
  UpdateStoreSettingsInput,
} from "../../../domains/settings/ports/storeSettingsRepository.js";

export type DrizzleStoreSettingsClient = PostgresJsDatabase<typeof schema>;

export function createDrizzleStoreSettingsRepository(
  db: DrizzleStoreSettingsClient,
): StoreSettingsRepository {
  return {
    async findByStore(input) {
      return findByStore(db, input);
    },
    async update(input) {
      return db.transaction(async (transaction) => {
        const tx = transaction as DrizzleStoreSettingsClient;
        if (input.identity) await updateIdentity(tx, input);
        await upsertProfile(tx, input);
        await upsertPublicSite(tx, input);

        const snapshot = await findByStore(tx, input);
        if (!snapshot)
          throw new Error(`Store settings not found: ${input.storeId}`);
        return snapshot;
      });
    },
  };
}

async function findByStore(
  db: DrizzleStoreSettingsClient,
  input: { storeId: string; tenantId: string },
): Promise<StoreSettingsSnapshot | null> {
  const [store] = await db
    .select()
    .from(stores)
    .where(
      and(
        eq(stores.id, input.storeId),
        eq(stores.tenantId, input.tenantId),
        eq(stores.isDeleted, false),
      ),
    )
    .limit(1);

  if (!store) return null;

  const [profile] = await db
    .select()
    .from(storeProfiles)
    .where(eq(storeProfiles.storeId, input.storeId))
    .limit(1);
  const [publicSite] = await db
    .select()
    .from(storePublicSiteSettings)
    .where(eq(storePublicSiteSettings.storeId, input.storeId))
    .limit(1);

  return toSnapshot(store, profile, publicSite);
}

async function updateIdentity(
  db: DrizzleStoreSettingsClient,
  input: UpdateStoreSettingsInput,
) {
  if (!input.identity) return;
  await db
    .update(stores)
    .set({
      ...(input.identity.legalName !== undefined
        ? { legalName: input.identity.legalName }
        : {}),
      ...(input.identity.primaryDomain !== undefined
        ? { primaryDomain: input.identity.primaryDomain }
        : {}),
      ...(input.identity.publicSlug !== undefined
        ? { publicSlug: input.identity.publicSlug }
        : {}),
      ...(input.identity.tradingName !== undefined
        ? { tradingName: input.identity.tradingName }
        : {}),
    })
    .where(
      and(eq(stores.id, input.storeId), eq(stores.tenantId, input.tenantId)),
    );
}

async function upsertProfile(
  db: DrizzleStoreSettingsClient,
  input: UpdateStoreSettingsInput,
) {
  if (!input.profile) return;
  await db
    .insert(storeProfiles)
    .values({
      ...input.profile,
      storeId: input.storeId,
      tenantId: input.tenantId,
    })
    .onConflictDoUpdate({
      set: input.profile,
      target: storeProfiles.storeId,
    });
}

async function upsertPublicSite(
  db: DrizzleStoreSettingsClient,
  input: UpdateStoreSettingsInput,
) {
  if (!input.publicSite) return;
  await db
    .insert(storePublicSiteSettings)
    .values({
      ...input.publicSite,
      storeId: input.storeId,
      tenantId: input.tenantId,
    })
    .onConflictDoUpdate({
      set: input.publicSite,
      target: storePublicSiteSettings.storeId,
    });
}

function toSnapshot(
  store: typeof stores.$inferSelect,
  profile?: typeof storeProfiles.$inferSelect,
  publicSite?: typeof storePublicSiteSettings.$inferSelect,
): StoreSettingsSnapshot {
  return {
    identity: {
      legalName: store.legalName,
      primaryDomain: store.primaryDomain,
      publicSlug: store.publicSlug,
      tradingName: store.tradingName,
    },
    profile: {
      addressCity: profile?.addressCity ?? null,
      addressLine1: profile?.addressLine1 ?? null,
      addressLine2: profile?.addressLine2 ?? null,
      addressState: profile?.addressState ?? null,
      addressZipCode: profile?.addressZipCode ?? null,
      businessHours: toRecord(profile?.businessHours),
      contactEmail: profile?.contactEmail ?? null,
      contactPhone: profile?.contactPhone ?? null,
      documentNumber: profile?.documentNumber ?? null,
      logoImageUrl: profile?.logoImageUrl ?? null,
      whatsappPhone: profile?.whatsappPhone ?? null,
    },
    publicSite: {
      customDomain: publicSite?.customDomain ?? null,
      customDomainStatus: publicSite?.customDomainStatus ?? "not_configured",
      heroImageUrl: publicSite?.heroImageUrl ?? null,
      isPublished: publicSite?.isPublished ?? false,
      lastDnsCheckAt: publicSite?.lastDnsCheckAt ?? null,
      layoutKey: publicSite?.layoutKey ?? "default",
      seoDescription: publicSite?.seoDescription ?? null,
      seoTitle: publicSite?.seoTitle ?? null,
      theme: toRecord(publicSite?.theme),
      verificationToken: publicSite?.verificationToken ?? null,
      verifiedAt: publicSite?.verifiedAt ?? null,
    },
    storeId: store.id as never,
    tenantId: store.tenantId as never,
  };
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
