import { z } from "zod";

export const agencyTenantParamsSchema = z.object({
  tenantId: z.string().uuid(),
});

export const agencyStoreEntitlementParamsSchema =
  agencyTenantParamsSchema.extend({
    featureKey: z.enum([
      "analytics",
      "automation",
      "compliance",
      "crm",
      "custom_domain",
      "external_api",
      "marketplace",
      "nfe",
      "plate_lookup",
      "subdomain",
    ]),
    storeId: z.string().uuid(),
  });
