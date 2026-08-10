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
      "crm_zapi",
      "custom_domain",
      "external_api",
      "marketplace",
      "fiscal",
      "plate_lookup",
      "subdomain",
    ]),
    storeId: z.string().uuid(),
  });

export const agencyStoreBillingParamsSchema = agencyTenantParamsSchema.extend({
  storeId: z.string().uuid(),
});
