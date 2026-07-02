import { and, desc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { storefrontMediaAssets } from "@lojaveiculosv2/db";
import type * as schema from "@lojaveiculosv2/db";
import type { StorefrontMediaAsset } from "@lojaveiculosv2/shared";
import type {
  StorefrontMediaRepository,
  StorefrontMediaScope,
  StorefrontMediaAssetCreateInput,
} from "../../../domains/storefront/ports/storefrontMediaRepository.js";

export type DrizzleStorefrontMediaClient = PostgresJsDatabase<typeof schema>;

export function createDrizzleStorefrontMediaRepository(
  db: DrizzleStorefrontMediaClient,
): StorefrontMediaRepository {
  return {
    async createAsset(scope, input) {
      const [row] = await db
        .insert(storefrontMediaAssets)
        .values(toInsert(scope, input))
        .returning();
      if (!row) throw new Error("Storefront media asset was not created.");
      return toAsset(row);
    },
    async listAssets(scope) {
      const rows = await db
        .select()
        .from(storefrontMediaAssets)
        .where(
          and(
            eq(storefrontMediaAssets.storeId, scope.storeId),
            eq(storefrontMediaAssets.tenantId, scope.tenantId),
            eq(storefrontMediaAssets.isDeleted, false),
          ),
        )
        .orderBy(desc(storefrontMediaAssets.createdAt));
      return rows.map(toAsset);
    },
  };
}

function toInsert(
  scope: StorefrontMediaScope,
  input: StorefrontMediaAssetCreateInput,
) {
  return {
    contentType: input.contentType,
    fileName: input.fileName,
    height: input.height ?? null,
    kind: input.kind,
    publicUrl: input.publicUrl,
    sizeBytes: input.sizeBytes,
    storageKey: input.storageKey,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
    width: input.width ?? null,
  };
}

function toAsset(
  row: typeof storefrontMediaAssets.$inferSelect,
): StorefrontMediaAsset {
  return {
    contentType: row.contentType,
    createdAt: row.createdAt.toISOString(),
    fileName: row.fileName,
    height: row.height,
    id: row.id,
    kind: row.kind,
    publicUrl: row.publicUrl,
    sizeBytes: row.sizeBytes,
    storageKey: row.storageKey,
    updatedAt: row.updatedAt.toISOString(),
    width: row.width,
  };
}
