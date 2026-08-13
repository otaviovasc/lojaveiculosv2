import { and, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  financingProviderAccounts,
  financingProviderTokens,
} from "@lojaveiculosv2/db";
import type * as schema from "@lojaveiculosv2/db";
import type {
  CompleteFinancingInquiryInput,
  CreateFinancingInquiryInput,
  CreateOAuthTransactionInput,
  FinancingRepository,
  RotateFinancingConnectionTokenInput,
  UpsertFinancingConnectionInput,
} from "../../../domains/financing/ports/financingRepository.js";
import type { CredereCredentialCodec } from "../../financing/credereCredentialCodec.js";
import { toConnection } from "./drizzleFinancingMappers.js";
import {
  completeInquiry,
  createInquiry,
  failInquiry,
  findInquiryById,
  listInquiries,
  markInquiryIndeterminate,
} from "./drizzleFinancingInquiries.js";
import { validateInquiryReferences } from "./drizzleFinancingReferenceValidation.js";
import {
  deleteStoreMapping,
  findStoreMapping,
  findTenantStore,
  listBankCredentials,
  listStoreMappings,
  upsertStoreMapping,
} from "./drizzleFinancingMappings.js";
import {
  cancelOAuthTransaction,
  claimOAuthTransaction,
  createOAuthTransaction,
  finishOAuthTransaction,
  saveOAuthExchangeToken,
} from "./drizzleFinancingOauth.js";
import { reserveOperation } from "./drizzleFinancingOperations.js";
import { claimRefreshTokenRotation } from "./drizzleFinancingTokenRotationClaim.js";

export type DrizzleFinancingClient = PostgresJsDatabase<typeof schema>;

export function createDrizzleFinancingRepository(
  db: DrizzleFinancingClient,
  input: {
    bankPolicyCodes?: readonly string[] | null;
    codec: CredereCredentialCodec;
    environment: "production" | "sandbox";
    redirectUri: string;
  },
): FinancingRepository {
  const codec = input.codec;
  return {
    completeInquiry: (entry) => completeInquiry(db, entry),
    cancelOAuthTransaction: (entry) =>
      cancelOAuthTransaction(db, entry, codec, input.redirectUri),
    claimOAuthTransaction: (entry) =>
      claimOAuthTransaction(db, entry, codec, input.redirectUri),
    createInquiry: (entry) => createInquiry(db, entry),
    createOAuthTransaction: (entry) =>
      createOAuthTransaction(db, entry, codec, input.environment),
    deleteStoreMapping: (entry) =>
      deleteStoreMapping(db, entry, input.environment),
    disconnectConnection: (entry) =>
      disconnectConnection(db, entry, codec, input.environment),
    failInquiry: (entry) => failInquiry(db, entry),
    findConnection: (entry) =>
      findConnection(db, entry, codec, input.environment),
    findInquiryById: (entry) => findInquiryById(db, entry),
    findStoreMapping: (entry) => findStoreMapping(db, entry, input.environment),
    findTenantStore: (entry) => findTenantStore(db, entry),
    listActiveOkayBankCredentials: (entry) =>
      listBankCredentials(db, entry, input.environment),
    listInquiries: (entry) => listInquiries(db, entry),
    listStoreMappings: (entry) =>
      listStoreMappings(db, entry, input.environment),
    markInquiryIndeterminate: (entry) => markInquiryIndeterminate(db, entry),
    finishOAuthTransaction: (entry) => finishOAuthTransaction(db, entry),
    readStoreBankPolicy: async () => input.bankPolicyCodes ?? null,
    reserveSimulationOperation: (entry) => reserveOperation(db, entry),
    rotateConnectionToken: (entry) =>
      rotateConnectionToken(db, entry, codec, input.environment),
    saveOAuthExchangeToken: (entry) => saveOAuthExchangeToken(db, entry, codec),
    upsertConnection: (entry) =>
      upsertConnection(db, entry, codec, input.environment),
    upsertStoreMapping: (entry) =>
      upsertStoreMapping(db, entry, input.environment),
    validateInquiryReferences: (entry) => validateInquiryReferences(db, entry),
  };
}

async function findConnection(
  db: DrizzleFinancingClient,
  input: { provider: "credere"; tenantId: string },
  codec: CredereCredentialCodec,
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
      ),
    )
    .limit(1);
  if (!account) return null;
  const tokens = await db
    .select()
    .from(financingProviderTokens)
    .where(
      and(
        eq(financingProviderTokens.accountId, account.id),
        eq(financingProviderTokens.tenantId, account.tenantId),
        isNull(financingProviderTokens.revokedAt),
      ),
    );
  return toConnection(account, tokens, codec);
}

async function upsertConnection(
  db: DrizzleFinancingClient,
  input: UpsertFinancingConnectionInput,
  codec: CredereCredentialCodec,
  environment: "production" | "sandbox",
) {
  return db.transaction(async (transaction) => {
    const client = transaction as DrizzleFinancingClient;
    const [account] = await client
      .insert(financingProviderAccounts)
      .values({
        connectedAt: new Date(),
        displayName: "Credere",
        environment,
        externalAccountId: input.providerAccountId,
        provider: input.provider,
        status: "active",
        tenantId: input.tenantId,
      })
      .onConflictDoUpdate({
        set: {
          connectedAt: new Date(),
          disconnectedAt: null,
          externalAccountId: input.providerAccountId,
          status: "active",
        },
        target: [
          financingProviderAccounts.tenantId,
          financingProviderAccounts.provider,
          financingProviderAccounts.environment,
        ],
      })
      .returning();
    if (!account) throw new Error("Credere account upsert failed.");
    await replaceTokens(client, account.id, input, codec);
    const connection = await findConnection(client, input, codec, environment);
    if (!connection) throw new Error("Credere connection readback failed.");
    return connection;
  });
}

async function replaceTokens(
  db: DrizzleFinancingClient,
  accountId: string,
  input: UpsertFinancingConnectionInput,
  codec: CredereCredentialCodec,
  previousRefreshToken: string | null = null,
) {
  await db
    .delete(financingProviderTokens)
    .where(eq(financingProviderTokens.accountId, accountId));
  const rows = [
    tokenRow(accountId, input, codec, "access_token", input.token.accessToken),
  ];
  const refreshToken = input.token.refreshToken ?? previousRefreshToken;
  if (refreshToken) {
    rows.push(tokenRow(accountId, input, codec, "refresh_token", refreshToken));
  }
  if (rows.length) await db.insert(financingProviderTokens).values(rows);
}

function tokenRow(
  accountId: string,
  input: UpsertFinancingConnectionInput,
  codec: CredereCredentialCodec,
  kind: "access_token" | "refresh_token",
  token: string,
) {
  return {
    accountId,
    encryptedToken: codec.encrypt(token),
    encryptionKeyRef: codec.keyRef,
    expiresAt: kind === "access_token" ? input.token.expiresAt : null,
    fingerprint: codec.fingerprint(token),
    kind,
    metadata: { scope: input.token.scope, tokenType: input.token.tokenType },
    tenantId: input.tenantId,
  };
}

async function rotateConnectionToken(
  db: DrizzleFinancingClient,
  input: RotateFinancingConnectionTokenInput,
  codec: CredereCredentialCodec,
  environment: "production" | "sandbox",
) {
  return db.transaction(async (transaction) => {
    const client = transaction as DrizzleFinancingClient;
    if (!(await claimRefreshTokenRotation(client, input, codec))) return null;
    await replaceTokens(
      client,
      input.connectionId,
      input,
      codec,
      input.previousRefreshToken,
    );
    const connection = await findConnection(client, input, codec, environment);
    if (!connection) throw new Error("Credere token rotation readback failed.");
    return connection;
  });
}

async function disconnectConnection(
  db: DrizzleFinancingClient,
  input: { disconnectedAt: Date; provider: "credere"; tenantId: string },
  codec: CredereCredentialCodec,
  environment: "production" | "sandbox",
) {
  const connection = await findConnection(db, input, codec, environment);
  if (!connection) return null;
  await db
    .update(financingProviderTokens)
    .set({ revokedAt: input.disconnectedAt })
    .where(eq(financingProviderTokens.accountId, connection.id));
  await db
    .update(financingProviderAccounts)
    .set({ disconnectedAt: input.disconnectedAt, status: "disconnected" })
    .where(eq(financingProviderAccounts.id, connection.id));
  return findConnection(db, input, codec, environment);
}
