import type { plans, subscriptions } from "@lojaveiculosv2/db";

export function toStorePlanContractItem(input: {
  plan: Pick<typeof plans.$inferSelect, "id" | "monthlyPriceCents">;
  startsAt: Date;
  storeId: string;
  subscription: Pick<typeof subscriptions.$inferSelect, "id">;
  tenantId: string;
}) {
  return {
    itemType: "plan" as const,
    planId: input.plan.id,
    quantity: 1,
    startsAt: input.startsAt,
    storeId: input.storeId,
    subscriptionId: input.subscription.id,
    tenantId: input.tenantId,
    unitAmountCents: input.plan.monthlyPriceCents,
  };
}
