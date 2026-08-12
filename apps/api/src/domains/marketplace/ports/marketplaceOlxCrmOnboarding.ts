import type { ServiceContext } from "../../../shared/serviceContext.js";

export type OlxCapabilityResult = {
  capability: "inventory_sync" | "lead_ingestion" | "messaging";
  grantState: "denied" | "granted";
  reason:
    | "access_denied"
    | "missing_scope"
    | "provider_rejected"
    | "runtime_unavailable"
    | null;
  status: "active" | "blocked" | "error";
};

export type OlxCrmOnboardingResult = {
  capabilities: {
    chat: OlxCapabilityResult;
    leads: OlxCapabilityResult;
  };
  connectionId: string;
  status: "active" | "degraded" | "error";
};

export type MarketplaceOlxCrmOnboarding = {
  onboard: (
    context: ServiceContext,
    input: {
      accessToken: string;
      providerAccountId: string | null;
      scopes: readonly string[];
      storeId: string;
      tenantId: string;
    },
  ) => Promise<OlxCrmOnboardingResult>;
  persistCapabilities?: (
    context: ServiceContext,
    input: {
      authorizationId: string;
      capabilities: {
        chat: OlxCapabilityResult;
        leads: OlxCapabilityResult;
        stock: OlxCapabilityResult;
      };
      connectionId: string | null;
      grantedScopes: readonly string[];
      providerAccountId: string | null;
      requestedScopes: readonly string[];
      storeId: string;
      tenantId: string;
    },
  ) => Promise<void>;
};
