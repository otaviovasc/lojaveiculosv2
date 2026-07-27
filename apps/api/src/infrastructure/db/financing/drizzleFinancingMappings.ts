import { and, eq } from "drizzle-orm";
import {
  financingProviderAccounts,
  financingProviderStoreBanks,
  financingProviderStoreMappings,
  stores,
} from "@lojaveiculosv2/db";
import { toBank, toStoreMapping } from "./drizzleFinancingMappers.js";
import type { DrizzleFinancingClient } from "./drizzleFinancingRepository.js";

export async function findStoreMapping(
  db: DrizzleFinancingClient,
  input: { provider: "credere"; storeId: string; tenantId: string },
  environment: "production" | "sandbox",
) {
  const [row] = await db
    .select({ mapping: financingProviderStoreMappings })
    .from(financingProviderStoreMappings)
    .innerJoin(
      financingProviderAccounts,
      eq(
        financingProviderStoreMappings.accountId,
        financingProviderAccounts.id,
      ),
    )
    .where(and(mappingScope(input), accountScope(input, environment)))
    .limit(1);
  return row ? toStoreMapping(row.mapping) : null;
}

export async function listStoreMappings(
  db: DrizzleFinancingClient,
  input: { provider: "credere"; tenantId: string },
  environment: "production" | "sandbox",
) {
  const rows = await db
    .select({ mapping: financingProviderStoreMappings })
    .from(financingProviderStoreMappings)
    .innerJoin(
      financingProviderAccounts,
      eq(
        financingProviderStoreMappings.accountId,
        financingProviderAccounts.id,
      ),
    )
    .where(accountScope(input, environment));
  return rows.map((row) => toStoreMapping(row.mapping));
}

export async function upsertStoreMapping(
  db: DrizzleFinancingClient,
  input: {
    provider: "credere";
    providerStoreId: string;
    providerStoreName: string | null;
    storeId: string;
    tenantId: string;
  },
  environment: "production" | "sandbox",
) {
  const account = await findAccount(db, input, environment);
  if (!account) throw new Error("Credere account is not connected.");
  const [row] = await db
    .insert(financingProviderStoreMappings)
    .values({
      accountId: account.id,
      externalStoreId: input.providerStoreId,
      metadata: { providerStoreName: input.providerStoreName },
      status: "active",
      storeId: input.storeId,
      tenantId: input.tenantId,
    })
    .onConflictDoUpdate({
      set: {
        externalStoreId: input.providerStoreId,
        metadata: { providerStoreName: input.providerStoreName },
        status: "active",
      },
      target: [
        financingProviderStoreMappings.accountId,
        financingProviderStoreMappings.storeId,
      ],
    })
    .returning();
  if (!row) throw new Error("Credere store mapping upsert failed.");
  return toStoreMapping(row);
}

export async function deleteStoreMapping(
  db: DrizzleFinancingClient,
  input: { provider: "credere"; storeId: string; tenantId: string },
  environment: "production" | "sandbox",
) {
  const mapping = await findStoreMapping(db, input, environment);
  if (!mapping) return false;
  const rows = await db
    .delete(financingProviderStoreMappings)
    .where(eq(financingProviderStoreMappings.id, mapping.id))
    .returning({ id: financingProviderStoreMappings.id });
  return rows.length > 0;
}

export async function listBankCredentials(
  db: DrizzleFinancingClient,
  input: {
    provider: "credere";
    providerStoreId: string;
    storeId: string;
    tenantId: string;
  },
  environment: "production" | "sandbox",
) {
  const mapping = await findStoreMapping(db, input, environment);
  if (!mapping) return [];
  const rows = await db
    .select()
    .from(financingProviderStoreBanks)
    .where(
      and(
        eq(financingProviderStoreBanks.mappingId, mapping.id),
        eq(financingProviderStoreBanks.isActive, true),
        eq(financingProviderStoreBanks.credentialStatus, "okay"),
      ),
    );
  return rows.map(toBank);
}

function accountScope(
  input: { provider: "credere"; tenantId: string },
  environment: "production" | "sandbox",
) {
  return and(
    eq(financingProviderAccounts.provider, input.provider),
    eq(financingProviderAccounts.tenantId, input.tenantId),
    eq(financingProviderAccounts.environment, environment),
    eq(financingProviderAccounts.status, "active"),
  );
}

export async function findTenantStore(
  db: DrizzleFinancingClient,
  input: { storeId: string; tenantId: string },
) {
  const [row] = await db
    .select({ storeId: stores.id, tenantId: stores.tenantId })
    .from(stores)
    .where(
      and(eq(stores.id, input.storeId), eq(stores.tenantId, input.tenantId)),
    )
    .limit(1);
  return row
    ? { storeId: row.storeId as never, tenantId: row.tenantId as never }
    : null;
}

function mappingScope(input: { storeId: string; tenantId: string }) {
  return and(
    eq(financingProviderStoreMappings.storeId, input.storeId),
    eq(financingProviderStoreMappings.tenantId, input.tenantId),
    eq(financingProviderStoreMappings.status, "active"),
  );
}

async function findAccount(
  db: DrizzleFinancingClient,
  input: { provider: "credere"; tenantId: string },
  environment: "production" | "sandbox",
) {
  const [account] = await db
    .select()
    .from(financingProviderAccounts)
    .where(
      and(
        eq(financingProviderAccounts.provider, input.provider),
        eq(financingProviderAccounts.tenantId, input.tenantId),
        eq(financingProviderAccounts.environment, environment),
        eq(financingProviderAccounts.status, "active"),
      ),
    )
    .limit(1);
  return account ?? null;
}
