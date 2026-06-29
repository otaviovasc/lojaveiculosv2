import { and, asc, eq, isNull, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  storeCustomPages,
  storeProfiles,
  storePublicSiteSettings,
  stores,
} from "@lojaveiculosv2/db";
import type * as schema from "@lojaveiculosv2/db";
import type {
  StorefrontPageRepository,
  StorefrontPageScope,
} from "../../../domains/storefront/ports/storefrontPageRepository.js";
import { createDrizzlePublicStorefrontRepository } from "./drizzlePublicStorefrontRepository.js";
import type { DrizzlePublicStorefrontClient } from "./drizzlePublicStorefrontQueryTypes.js";
import {
  toPublicCustomPageSnapshot,
  toStorefrontCustomPage,
  toStorefrontPageUpdate,
  type StorefrontPageRow,
} from "./drizzleStorefrontPageMapper.js";

export type DrizzleStorefrontPageClient = PostgresJsDatabase<typeof schema>;

export function createDrizzleStorefrontPageRepository(
  db: DrizzleStorefrontPageClient,
): StorefrontPageRepository {
  return {
    async createCustomPage(scope, input) {
      const [row] = await db
        .insert(storeCustomPages)
        .values({
          description: input.description ?? null,
          displayOrder: input.order,
          secretToken: input.secretToken,
          slug: input.slug,
          storeId: scope.storeId,
          tenantId: scope.tenantId,
          title: input.title,
        })
        .returning();
      return toStorefrontCustomPage(requireRow(row));
    },
    async deleteCustomPage(scope) {
      const [row] = await db
        .update(storeCustomPages)
        .set({ deletedAt: new Date(), isDeleted: true })
        .where(createPageScopeCondition(scope))
        .returning({ id: storeCustomPages.id });
      return Boolean(row);
    },
    async findCustomPageById(scope) {
      const [row] = await db
        .select()
        .from(storeCustomPages)
        .where(createPageScopeCondition(scope))
        .limit(1);
      return row ? toStorefrontCustomPage(row) : null;
    },
    async findPublicCustomPageBySlug(input) {
      const row = await selectPublicCustomPageRow(db, input);
      if (!row) return null;
      const vehicles = await createDrizzlePublicStorefrontRepository(
        db as unknown as DrizzlePublicStorefrontClient,
      ).listPublicListings({
        limit: 12,
        storeId: row.store.id as never,
        tenantId: row.store.tenantId as never,
      });
      return toPublicCustomPageSnapshot(row, vehicles);
    },
    async listCustomPages(scope) {
      const rows = await db
        .select()
        .from(storeCustomPages)
        .where(createStoreScopeCondition(scope))
        .orderBy(
          asc(storeCustomPages.displayOrder),
          asc(storeCustomPages.title),
        );
      return rows.map(toStorefrontCustomPage);
    },
    async updateCustomPage(scope, input) {
      const update = toStorefrontPageUpdate(input);
      if (Object.keys(update).length === 0)
        return this.findCustomPageById(scope);
      const [row] = await db
        .update(storeCustomPages)
        .set(update)
        .where(createPageScopeCondition(scope))
        .returning();
      return row ? toStorefrontCustomPage(row) : null;
    },
  };
}

async function selectPublicCustomPageRow(
  db: DrizzleStorefrontPageClient,
  input: { pageSlug: string; storeSlug: string },
) {
  const [row] = await db
    .select({
      page: storeCustomPages,
      profile: storeProfiles,
      publicSite: storePublicSiteSettings,
      store: stores,
    })
    .from(storeCustomPages)
    .innerJoin(
      stores,
      and(
        eq(stores.id, storeCustomPages.storeId),
        eq(stores.tenantId, storeCustomPages.tenantId),
      ),
    )
    .innerJoin(
      storePublicSiteSettings,
      and(
        eq(storePublicSiteSettings.storeId, stores.id),
        eq(storePublicSiteSettings.tenantId, stores.tenantId),
      ),
    )
    .leftJoin(
      storeProfiles,
      and(
        eq(storeProfiles.storeId, stores.id),
        eq(storeProfiles.tenantId, stores.tenantId),
      ),
    )
    .where(
      and(
        eq(storeCustomPages.slug, input.pageSlug),
        createPublicStoreLookupCondition(input.storeSlug),
        eq(storeCustomPages.isDeleted, false),
        isNull(storeCustomPages.deletedAt),
        eq(stores.isDeleted, false),
        isNull(stores.deletedAt),
      ),
    )
    .limit(1);

  return row ?? null;
}

function createStoreScopeCondition(scope: StorefrontPageScope) {
  return and(
    eq(storeCustomPages.storeId, scope.storeId),
    eq(storeCustomPages.tenantId, scope.tenantId),
    eq(storeCustomPages.isDeleted, false),
    isNull(storeCustomPages.deletedAt),
  );
}

function createPageScopeCondition(
  scope: StorefrontPageScope & { pageId: string },
) {
  return and(
    createStoreScopeCondition(scope),
    eq(storeCustomPages.id, scope.pageId),
  );
}

function createPublicStoreLookupCondition(storeLookupKey: string) {
  return or(
    eq(stores.publicSlug, storeLookupKey),
    and(
      eq(storePublicSiteSettings.customDomain, storeLookupKey),
      eq(storePublicSiteSettings.customDomainStatus, "verified"),
    ),
  );
}

function requireRow(row: StorefrontPageRow | undefined): StorefrontPageRow {
  if (!row) throw new Error("Storefront custom page write returned no row.");
  return row;
}
