import type { MarketplaceOlxCrmOnboarding } from "../../domains/marketplace/ports/marketplaceOlxCrmOnboarding.js";
import { onboardOlxCrmConnection } from "../../domains/crm/services/CrmService/onboardOlxCrmConnection.js";
import { createCrmConnectionCredentialVault } from "../crm/crmConnectionCredentialVault.js";
import { createOlxCrmWebhookSetupProvider } from "../crm/olxCrmWebhookSetupProvider.js";
import { createDrizzleCrmConnectionRepository } from "../db/crm/drizzleCrmConnectionRepository.js";
import type { DrizzleCrmClient } from "../db/crm/drizzleCrmRepository.js";

export function createRuntimeOlxCrmOnboarding(
  db: DrizzleCrmClient,
  env: Record<string, string | undefined>,
): MarketplaceOlxCrmOnboarding {
  const canonicalApiOrigin = readCanonicalOrigin(env);
  const ports = {
    crmConnectionCredentialVault: createCrmConnectionCredentialVault(env),
    crmConnectionRepository: createDrizzleCrmConnectionRepository(db),
    crmRepository: {} as never,
    olxCrmWebhookSetupProvider: createOlxCrmWebhookSetupProvider(),
  };
  return {
    onboard: (context, input) =>
      onboardOlxCrmConnection(context, { ...input, canonicalApiOrigin }, ports),
  };
}

function readCanonicalOrigin(env: Record<string, string | undefined>) {
  const configured = env.PUBLIC_APP_URL?.trim();
  if (
    !configured &&
    (env.APP_ENV === "local" ||
      env.NODE_ENV === "test" ||
      env.NODE_ENV === "development")
  ) {
    return "http://localhost:8787";
  }
  if (!configured)
    throw new Error("PUBLIC_APP_URL is required for OLX CRM callbacks.");
  const url = new URL(configured);
  if (
    url.protocol !== "https:" &&
    env.APP_ENV !== "local" &&
    env.NODE_ENV !== "test"
  )
    throw new Error("OLX CRM callbacks require an HTTPS PUBLIC_APP_URL.");
  return url.origin;
}
