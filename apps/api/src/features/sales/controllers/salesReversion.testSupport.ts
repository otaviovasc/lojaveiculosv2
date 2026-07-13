import type { SaveSaleDraftInput } from "../../../domains/sales/ports/salesRepository.js";
import type { SalesServices } from "./salesServices.js";
import {
  completeDraft,
  context,
} from "./salesWorkflowTransition.testSupport.js";

export async function closeSale(
  services: SalesServices,
  extra: SaveSaleDraftInput = {},
) {
  const draft = await services.createDraft(context(["sale.draft"]), {
    ...completeDraft(),
    payments: [
      {
        amountCents: 5000000,
        method: "pix",
        principalCents: 5000000,
      },
    ],
    ...extra,
  });
  return services.transition(context(["sale.close"]), {
    saleId: draft.id,
    status: "closed",
  });
}
