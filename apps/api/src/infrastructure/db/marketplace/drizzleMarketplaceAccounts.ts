import { and, eq, isNull } from "drizzle-orm";
import { integrationAccounts } from "@lojaveiculosv2/db";
import type {
  MarketplaceAccount,
  UpsertMarketplaceAccountInput,
} from "../../../domains/marketplace/ports/marketplaceRepository.js";
import type { MarketplaceCredentialCodec } from "../../marketplace/marketplaceCredentialCodec.js";
import { toAccount } from "./drizzleMarketplaceMappers.js";
import type { DrizzleMarketplaceClient } from "./drizzleMarketplaceRepository.js";

export async function upsertMarketplaceAccount(
  db: DrizzleMarketplaceClient,
  input: UpsertMarketplaceAccountInput,
  codec: MarketplaceCredentialCodec,
): Promise<MarketplaceAccount> {
  const [existing] = await db
    .select()
    .from(integrationAccounts)
    .where(
      and(
        eq(integrationAccounts.provider, input.provider),
        eq(integrationAccounts.storeId, input.storeId),
        eq(integrationAccounts.tenantId, input.tenantId),
        isNull(integrationAccounts.archivedAt),
      ),
    )
    .limit(1);
  const replacesIdentity = Boolean(
    existing &&
    input.providerAccountId !== undefined &&
    existing.providerAccountId !== input.providerAccountId,
  );
  if (existing && replacesIdentity) {
    await db
      .update(integrationAccounts)
      .set({
        archivedAt: new Date(),
        status: "inactive",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(integrationAccounts.id, existing.id),
          isNull(integrationAccounts.archivedAt),
        ),
      );
  }
  const encodedConfig = codec.encodeAccountConfig(input.config);
  const [row] =
    existing && !replacesIdentity
      ? await db
          .update(integrationAccounts)
          .set({
            config: encodedConfig,
            status: input.status,
            updatedAt: new Date(),
          })
          .where(eq(integrationAccounts.id, existing.id))
          .returning()
      : await db
          .insert(integrationAccounts)
          .values({
            config: encodedConfig,
            provider: input.provider,
            providerAccountId: input.providerAccountId ?? null,
            status: input.status,
            storeId: input.storeId,
            tenantId: input.tenantId,
          })
          .returning();
  if (!row) throw new Error("Marketplace account upsert failed.");
  return toAccount(row, codec.redactAccountConfig);
}
