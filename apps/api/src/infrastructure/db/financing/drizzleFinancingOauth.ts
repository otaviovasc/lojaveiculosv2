import { and, eq, gt, isNull, lte, or } from "drizzle-orm";
import { providerOauthTransactions } from "@lojaveiculosv2/db";
import type {
  CreateOAuthTransactionInput,
  FinancingTokenSet,
} from "../../../domains/financing/ports/financingRepository.js";
import type { CredereCredentialCodec } from "../../financing/credereCredentialCodec.js";
import { serializeCredereOAuthToken } from "../../financing/credereOAuthTokenSerialization.js";
import { toOAuthTransaction } from "./drizzleFinancingMappers.js";
import type { DrizzleFinancingClient } from "./drizzleFinancingRepository.js";

export async function createOAuthTransaction(
  db: DrizzleFinancingClient,
  input: CreateOAuthTransactionInput,
  codec: CredereCredentialCodec,
  environment: "production" | "sandbox",
) {
  const [row] = await db
    .insert(providerOauthTransactions)
    .values({
      codeChallengeMethod: input.codeVerifier ? "S256" : null,
      codeVerifierCiphertext: input.codeVerifier
        ? codec.encrypt(input.codeVerifier)
        : null,
      environment,
      expiresAt: input.expiresAt,
      provider: input.provider,
      redirectUriHash: codec.fingerprint(input.redirectUri),
      requestedByUserId: input.requestedByUserId ?? null,
      stateHash: input.stateHash,
      status: "pending",
      tenantId: input.tenantId,
    })
    .returning();
  if (!row) throw new Error("Credere OAuth transaction insert failed.");
  return toOAuthTransaction(row, codec, input.redirectUri);
}

export async function claimOAuthTransaction(
  db: DrizzleFinancingClient,
  input: {
    provider: "credere";
    leaseExpiresAt: Date;
    leaseOwner: string;
    stateHash: string;
    tenantId?: string;
    usedAt: Date;
  },
  codec: CredereCredentialCodec,
  redirectUri: string,
) {
  const where = [
    eq(providerOauthTransactions.provider, input.provider),
    eq(
      providerOauthTransactions.redirectUriHash,
      codec.fingerprint(redirectUri),
    ),
    eq(providerOauthTransactions.stateHash, input.stateHash),
    eq(providerOauthTransactions.status, "pending"),
    or(
      isNull(providerOauthTransactions.exchangeLeaseExpiresAt),
      lte(providerOauthTransactions.exchangeLeaseExpiresAt, input.usedAt),
    )!,
    isNull(providerOauthTransactions.consumedAt),
    gt(providerOauthTransactions.expiresAt, input.usedAt),
    ...(input.tenantId
      ? [eq(providerOauthTransactions.tenantId, input.tenantId)]
      : []),
  ];
  const [row] = await db
    .update(providerOauthTransactions)
    .set({
      exchangeLeaseExpiresAt: input.leaseExpiresAt,
      exchangeLeaseOwner: input.leaseOwner,
      status: "pending",
    })
    .where(and(...where))
    .returning();
  return row ? toOAuthTransaction(row, codec, redirectUri) : null;
}

export async function cancelOAuthTransaction(
  db: DrizzleFinancingClient,
  input: {
    provider: "credere";
    stateHash: string;
    tenantId?: string;
    usedAt: Date;
  },
  codec: CredereCredentialCodec,
  redirectUri: string,
) {
  const [row] = await db
    .update(providerOauthTransactions)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(providerOauthTransactions.provider, input.provider),
        eq(
          providerOauthTransactions.redirectUriHash,
          codec.fingerprint(redirectUri),
        ),
        eq(providerOauthTransactions.stateHash, input.stateHash),
        eq(providerOauthTransactions.status, "pending"),
        isNull(providerOauthTransactions.consumedAt),
        isNull(providerOauthTransactions.exchangeLeaseOwner),
        gt(providerOauthTransactions.expiresAt, input.usedAt),
        ...(input.tenantId
          ? [eq(providerOauthTransactions.tenantId, input.tenantId)]
          : []),
      ),
    )
    .returning();
  return row ? toOAuthTransaction(row, codec, redirectUri) : null;
}

export async function saveOAuthExchangeToken(
  db: DrizzleFinancingClient,
  input: {
    leaseOwner: string;
    token: FinancingTokenSet;
    transactionId: string;
  },
  codec: CredereCredentialCodec,
) {
  const [row] = await db
    .update(providerOauthTransactions)
    .set({
      exchangeTokenCiphertext: codec.encrypt(
        serializeCredereOAuthToken(input.token),
      ),
    })
    .where(
      and(
        eq(providerOauthTransactions.id, input.transactionId),
        eq(providerOauthTransactions.status, "pending"),
        eq(providerOauthTransactions.exchangeLeaseOwner, input.leaseOwner),
      ),
    )
    .returning({ id: providerOauthTransactions.id });
  return Boolean(row);
}

export async function finishOAuthTransaction(
  db: DrizzleFinancingClient,
  input: {
    leaseOwner: string;
    succeeded: boolean;
    transactionId: string;
    usedAt: Date;
  },
) {
  const [row] = await db
    .update(providerOauthTransactions)
    .set({
      consumedAt: input.succeeded ? input.usedAt : null,
      exchangeLeaseExpiresAt: null,
      exchangeLeaseOwner: null,
      exchangeTokenCiphertext: input.succeeded ? null : undefined,
      status: input.succeeded ? "consumed" : "pending",
    })
    .where(
      and(
        eq(providerOauthTransactions.id, input.transactionId),
        eq(providerOauthTransactions.status, "pending"),
        eq(providerOauthTransactions.exchangeLeaseOwner, input.leaseOwner),
      ),
    )
    .returning({ id: providerOauthTransactions.id });
  return Boolean(row);
}
