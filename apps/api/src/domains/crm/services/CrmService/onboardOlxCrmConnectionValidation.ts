import type { ServiceContext } from "../../../../shared/serviceContext.js";

export function logOlxOnboardingStarted(
  context: ServiceContext,
  scope: { storeId: string; tenantId: string },
) {
  context.logger.info("crm.connection.olx.onboard.started", {
    actorId: context.actor.id,
    provider: "olx",
    requestId: context.requestId,
    storeId: scope.storeId,
    tenantId: scope.tenantId,
  });
}

export function requireOlxOnboardingProviderAccount(
  context: ServiceContext,
  input: {
    providerAccountId: string | null;
    storeId: string;
    tenantId: string;
  },
) {
  if (
    context.storeId !== input.storeId ||
    context.tenantId !== input.tenantId
  ) {
    throw new Error("OLX CRM OAuth scope binding mismatch.");
  }
  const providerAccountId = input.providerAccountId?.trim();
  if (!providerAccountId) {
    throw new Error(
      "OLX account identity could not be authoritatively verified.",
    );
  }
  return providerAccountId;
}
