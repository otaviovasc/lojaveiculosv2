import { and, eq, gt, isNull } from "drizzle-orm";
import { providerOauthTransactions } from "@lojaveiculosv2/db";
import type { CreateOAuthTransactionInput } from "../../../domains/financing/ports/financingRepository.js";
import type { CredereCredentialCodec } from "../../financing/credereCredentialCodec.js";
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

export async function consumeOAuthTransaction(
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
  const where = [
    eq(providerOauthTransactions.provider, input.provider),
    eq(
      providerOauthTransactions.redirectUriHash,
      codec.fingerprint(redirectUri),
    ),
    eq(providerOauthTransactions.stateHash, input.stateHash),
    eq(providerOauthTransactions.status, "pending"),
    isNull(providerOauthTransactions.consumedAt),
    gt(providerOauthTransactions.expiresAt, input.usedAt),
    ...(input.tenantId
      ? [eq(providerOauthTransactions.tenantId, input.tenantId)]
      : []),
  ];
  const [row] = await db
    .update(providerOauthTransactions)
    .set({ consumedAt: input.usedAt, status: "consumed" })
    .where(and(...where))
    .returning();
  return row ? toOAuthTransaction(row, codec, redirectUri) : null;
}
