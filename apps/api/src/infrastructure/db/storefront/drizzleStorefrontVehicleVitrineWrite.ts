import { and, eq, isNull, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { storeCustomPages } from "@lojaveiculosv2/db";
import type * as schema from "@lojaveiculosv2/db";
import type {
  StorefrontPageScope,
  VehicleVitrinePageWrite,
} from "../../../domains/storefront/ports/storefrontPageRepository.js";
import { toStorefrontCustomPage } from "./drizzleStorefrontPageMapper.js";

type Client = PostgresJsDatabase<typeof schema>;

export async function writeVehicleVitrine(
  db: Client,
  scope: StorefrontPageScope,
  input: VehicleVitrinePageWrite,
) {
  const [boundRow] = await db
    .update(storeCustomPages)
    .set(vehicleVitrineReuseUpdate(input.visible))
    .where(
      and(
        storeScope(scope),
        eq(storeCustomPages.sourceListingId, input.listingId),
      ),
    )
    .returning();
  if (boundRow) return toStorefrontCustomPage(boundRow);

  const [legacyRow] = await db
    .update(storeCustomPages)
    .set(vehicleVitrineLegacyAdoptionUpdate(input.listingId, input.visible))
    .where(
      and(
        storeScope(scope),
        eq(storeCustomPages.slug, input.slug),
        isNull(storeCustomPages.sourceListingId),
      ),
    )
    .returning();
  if (legacyRow) return toStorefrontCustomPage(legacyRow);

  const [row] = await db
    .insert(storeCustomPages)
    .values({
      components: input.components,
      description: input.description,
      isPublished: input.visible,
      secretToken: crypto.randomUUID(),
      slug: input.slug,
      sourceListingId: input.listingId,
      storeId: scope.storeId,
      tenantId: scope.tenantId,
      title: input.title,
    })
    .onConflictDoUpdate({
      set: vehicleVitrineReuseUpdate(input.visible),
      target: [
        storeCustomPages.tenantId,
        storeCustomPages.storeId,
        storeCustomPages.sourceListingId,
      ],
      targetWhere: sql`${storeCustomPages.isDeleted} = false AND ${storeCustomPages.sourceListingId} IS NOT NULL`,
    })
    .returning();
  if (!row) throw new Error("Storefront custom page write returned no row.");
  return toStorefrontCustomPage(row);
}

export function vehicleVitrineReuseUpdate(visible: boolean) {
  return { isPublished: visible, updatedAt: new Date() };
}

export function vehicleVitrineLegacyAdoptionUpdate(
  listingId: string,
  visible: boolean,
) {
  return {
    ...vehicleVitrineReuseUpdate(visible),
    sourceListingId: listingId,
  };
}

function storeScope(scope: StorefrontPageScope) {
  return and(
    eq(storeCustomPages.storeId, scope.storeId),
    eq(storeCustomPages.tenantId, scope.tenantId),
    eq(storeCustomPages.isDeleted, false),
    isNull(storeCustomPages.deletedAt),
  );
}
