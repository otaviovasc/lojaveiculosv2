import type { ServiceContext } from "../../../shared/serviceContext.js";

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
  ) => Promise<{ connectionId: string; status: "active" | "error" }>;
};
