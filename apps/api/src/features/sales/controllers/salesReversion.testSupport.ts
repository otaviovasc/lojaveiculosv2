import type { SalesServices } from "./salesServices.js";
import {
  completeDraft,
  context,
} from "./salesWorkflowTransition.testSupport.js";

export async function closeSale(
  services: SalesServices,
  extra: Record<string, unknown> = {},
) {
  const draft = await services.createDraft(context(["sale.draft"]), {
    ...completeDraft(),
    ...extra,
    payments: [
      {
        amountCents: 5000000,
        method: "pix",
        paidAt: new Date("2026-07-12T12:00:00.000Z"),
        principalCents: 5000000,
        providerPaymentId: "provider-payment-1",
        status: "paid",
      },
    ],
  });
  return services.transition(context(["sale.close"]), {
    saleId: draft.id,
    status: "closed",
  });
}
