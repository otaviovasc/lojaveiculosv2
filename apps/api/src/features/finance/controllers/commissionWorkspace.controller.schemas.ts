import { z } from "zod";

export const commissionWorkspaceQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
});

export const settleCommissionEntriesSchema = z.object({
  entryIds: z.array(z.string().trim().min(1)).min(1).max(500),
  paidAt: z.coerce.date(),
  sellerUserId: z.string().trim().min(1),
});
