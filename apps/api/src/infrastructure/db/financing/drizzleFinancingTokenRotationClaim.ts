import { and, eq, isNull } from "drizzle-orm";
import { financingProviderTokens } from "@lojaveiculosv2/db";
import type { RotateFinancingConnectionTokenInput } from "../../../domains/financing/ports/financingRepository.js";
import type { CredereCredentialCodec } from "../../financing/credereCredentialCodec.js";
import type { DrizzleFinancingClient } from "./drizzleFinancingRepository.js";

export async function claimRefreshTokenRotation(
  db: DrizzleFinancingClient,
  input: RotateFinancingConnectionTokenInput,
  codec: CredereCredentialCodec,
) {
  if (!input.previousRefreshToken) return false;
  const [claimed] = await db
    .update(financingProviderTokens)
    .set({ updatedAt: new Date() })
    .where(
      and(
        eq(financingProviderTokens.accountId, input.connectionId),
        eq(financingProviderTokens.tenantId, input.tenantId),
        eq(financingProviderTokens.kind, "refresh_token"),
        eq(
          financingProviderTokens.fingerprint,
          codec.fingerprint(input.previousRefreshToken),
        ),
        isNull(financingProviderTokens.revokedAt),
      ),
    )
    .returning({ id: financingProviderTokens.id });
  return Boolean(claimed);
}
