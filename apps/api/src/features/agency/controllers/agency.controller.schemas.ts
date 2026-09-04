import { z } from "zod";

export const agencyTenantParamsSchema = z.object({
  tenantId: z.string().uuid(),
});

export const agencyStoreBillingParamsSchema = agencyTenantParamsSchema.extend({
  storeId: z.string().uuid(),
});
