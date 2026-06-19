import { z } from "zod";

export const updateEntitlementSchema = z.object({
  endsAt: z.string().datetime().nullable().optional(),
  featureKey: z.enum([
    "crm",
    "custom_domain",
    "external_api",
    "nfe",
    "plate_lookup",
    "subdomain",
  ]),
  metadata: z.record(z.string(), z.unknown()).optional(),
  startsAt: z.string().datetime().nullable().optional(),
  status: z.enum(["active", "inactive", "suspended", "trialing"]),
});
