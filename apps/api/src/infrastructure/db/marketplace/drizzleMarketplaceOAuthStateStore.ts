import { randomBytes } from "node:crypto";
import { and, eq, gt, isNull, lte, or, type SQL } from "drizzle-orm";
import { marketplaceOauthTransactions } from "@lojaveiculosv2/db";
import type {
  MarketplaceOAuthStateBinding,
  MarketplaceOAuthStateStore,
  MarketplaceOAuthTransaction,
} from "../../../domains/marketplace/ports/marketplaceOAuthStateStore.js";
import {
  createMarketplaceCredentialCodec,
  type MarketplaceCredentialCodec,
} from "../../marketplace/marketplaceCredentialCodec.js";
import type { DrizzleMarketplaceClient } from "./drizzleMarketplaceRepository.js";

export function createDrizzleMarketplaceOAuthStateStore(
  db: DrizzleMarketplaceClient,
  env: Record<string, string | undefined>,
  codec: MarketplaceCredentialCodec = createMarketplaceCredentialCodec(env),
): MarketplaceOAuthStateStore {
  assertOAuthCodeEncryptionConfigured(env);

  return {
    cancelPending: (input) => transitionPending(db, codec, input, "cancelled"),
    consumePending: (input) => transitionPending(db, codec, input, "consumed"),
    async claimReceived({
      binding,
      leaseExpiresAt,
      leaseOwner,
      transactionId,
      usedAt,
    }) {
      const conditions = [
        eq(marketplaceOauthTransactions.id, transactionId),
        or(
          eq(marketplaceOauthTransactions.status, "received"),
          and(
            eq(marketplaceOauthTransactions.status, "exchanging"),
            lte(marketplaceOauthTransactions.exchangeLeaseExpiresAt, usedAt),
          ),
        )!,
        isNull(marketplaceOauthTransactions.consumedAt),
        gt(marketplaceOauthTransactions.expiresAt, usedAt),
        ...bindingConditions(binding),
      ];
      const [row] = await db
        .update(marketplaceOauthTransactions)
        .set({
          exchangeLeaseExpiresAt: leaseExpiresAt,
          exchangeLeaseOwner: leaseOwner,
          status: "exchanging",
        })
        .where(and(...conditions))
        .returning();
      if (!row?.authorizationCodeCiphertext) return null;
      return {
        ...toTransaction(row),
        authorizationCode: codec.decryptSecret(row.authorizationCodeCiphertext),
        exchangeToken: row.exchangeTokenCiphertext
          ? decodeExchangeToken(
              codec.decryptSecret(row.exchangeTokenCiphertext),
            )
          : null,
      };
    },
    async saveExchangeToken({ leaseOwner, token, transactionId }) {
      const [row] = await db
        .update(marketplaceOauthTransactions)
        .set({
          exchangeTokenCiphertext: codec.encryptSecret(
            JSON.stringify({
              ...token,
              expiresAt: token.expiresAt?.toISOString() ?? null,
            }),
          ),
        })
        .where(
          and(
            eq(marketplaceOauthTransactions.id, transactionId),
            eq(marketplaceOauthTransactions.status, "exchanging"),
            eq(marketplaceOauthTransactions.exchangeLeaseOwner, leaseOwner),
          ),
        )
        .returning({ id: marketplaceOauthTransactions.id });
      return Boolean(row);
    },
    async finishExchange({ leaseOwner, succeeded, transactionId, usedAt }) {
      const [row] = await db
        .update(marketplaceOauthTransactions)
        .set({
          authorizationCodeCiphertext: succeeded ? null : undefined,
          exchangeTokenCiphertext: succeeded ? null : undefined,
          consumedAt: succeeded ? usedAt : null,
          exchangeLeaseExpiresAt: null,
          exchangeLeaseOwner: null,
          status: succeeded ? "consumed" : "received",
        })
        .where(
          and(
            eq(marketplaceOauthTransactions.id, transactionId),
            eq(marketplaceOauthTransactions.status, "exchanging"),
            eq(marketplaceOauthTransactions.exchangeLeaseOwner, leaseOwner),
          ),
        )
        .returning({ id: marketplaceOauthTransactions.id });
      return Boolean(row);
    },
    async issue(input) {
      const state = randomBytes(32).toString("base64url");
      const [row] = await db
        .insert(marketplaceOauthTransactions)
        .values({
          expiresAt: input.expiresAt,
          provider: input.provider,
          redirectUri: input.redirectUri,
          requestId: input.requestId,
          requestedByUserId: input.actorId,
          stateHash: codec.fingerprint(state),
          status: "pending",
          storeId: input.storeId,
          tenantId: input.tenantId,
        })
        .returning();
      if (!row) throw new Error("Marketplace OAuth transaction insert failed.");
      return { ...toTransaction(row), state };
    },
    async receiveCallback({ authorizationCode, binding, receivedAt, state }) {
      const [row] = await db
        .update(marketplaceOauthTransactions)
        .set({
          authorizationCodeCiphertext: codec.encryptSecret(authorizationCode),
          callbackReceivedAt: receivedAt,
          status: "received",
        })
        .where(
          and(
            eq(
              marketplaceOauthTransactions.stateHash,
              codec.fingerprint(state),
            ),
            eq(marketplaceOauthTransactions.status, "pending"),
            isNull(marketplaceOauthTransactions.callbackReceivedAt),
            isNull(marketplaceOauthTransactions.consumedAt),
            gt(marketplaceOauthTransactions.expiresAt, receivedAt),
            ...bindingConditions(binding),
          ),
        )
        .returning();
      return row ? toTransaction(row) : null;
    },
  };
}
function decodeExchangeToken(value: string) {
  const token = JSON.parse(value) as Record<string, unknown>;
  if (typeof token.accessToken !== "string" || !token.accessToken.trim())
    throw new Error("Stored marketplace token is invalid.");
  return {
    accessToken: token.accessToken,
    expiresAt:
      typeof token.expiresAt === "string" ? new Date(token.expiresAt) : null,
    providerAccountId:
      typeof token.providerAccountId === "string"
        ? token.providerAccountId
        : null,
    refreshToken:
      typeof token.refreshToken === "string" ? token.refreshToken : null,
    scope: typeof token.scope === "string" ? token.scope : null,
    tokenType: typeof token.tokenType === "string" ? token.tokenType : null,
  };
}

async function transitionPending(
  db: DrizzleMarketplaceClient,
  codec: MarketplaceCredentialCodec,
  input: {
    binding: MarketplaceOAuthStateBinding;
    state: string;
    usedAt: Date;
  },
  status: "cancelled" | "consumed",
) {
  const [row] = await db
    .update(marketplaceOauthTransactions)
    .set({ consumedAt: input.usedAt, status })
    .where(
      and(
        eq(
          marketplaceOauthTransactions.stateHash,
          codec.fingerprint(input.state),
        ),
        eq(marketplaceOauthTransactions.status, "pending"),
        isNull(marketplaceOauthTransactions.consumedAt),
        gt(marketplaceOauthTransactions.expiresAt, input.usedAt),
        ...bindingConditions(input.binding),
      ),
    )
    .returning();
  return row ? toTransaction(row) : null;
}

function bindingConditions(binding: MarketplaceOAuthStateBinding): SQL[] {
  return [
    ...(binding.actorId
      ? [eq(marketplaceOauthTransactions.requestedByUserId, binding.actorId)]
      : []),
    ...(binding.provider
      ? [eq(marketplaceOauthTransactions.provider, binding.provider)]
      : []),
    ...(binding.redirectUri
      ? [eq(marketplaceOauthTransactions.redirectUri, binding.redirectUri)]
      : []),
    ...(binding.storeId
      ? [eq(marketplaceOauthTransactions.storeId, binding.storeId)]
      : []),
    ...(binding.tenantId
      ? [eq(marketplaceOauthTransactions.tenantId, binding.tenantId)]
      : []),
  ];
}

function toTransaction(
  row: typeof marketplaceOauthTransactions.$inferSelect,
): MarketplaceOAuthTransaction {
  return {
    actorId: row.requestedByUserId,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    id: row.id,
    provider: row.provider as MarketplaceOAuthTransaction["provider"],
    redirectUri: row.redirectUri,
    requestId: row.requestId,
    storeId: row.storeId,
    tenantId: row.tenantId,
  };
}

function assertOAuthCodeEncryptionConfigured(
  env: Record<string, string | undefined>,
) {
  const allowsLocalEncoding =
    env.APP_ENV === "local" ||
    env.APP_ENV === "test" ||
    env.NODE_ENV === "development" ||
    env.NODE_ENV === "test";
  if (!env.MARKETPLACE_CREDENTIAL_ENCRYPTION_KEY && !allowsLocalEncoding) {
    throw new Error(
      "MARKETPLACE_CREDENTIAL_ENCRYPTION_KEY must be configured for marketplace OAuth.",
    );
  }
}
