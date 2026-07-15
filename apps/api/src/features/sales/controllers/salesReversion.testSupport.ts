import type { SaveSaleDraftInput } from "../../../domains/sales/ports/salesRepository.js";
import { salePaymentMethodUsesInstallments } from "@lojaveiculosv2/shared";
import type { SalesServices } from "./salesServices.js";
import {
  completeDraft,
  context,
} from "./salesWorkflowTransition.testSupport.js";

export async function closeSale(
  services: SalesServices,
  extra: SaveSaleDraftInput = {},
) {
  const payments = extra.payments ?? [
    {
      amountCents: 5000000,
      method: "pix" as const,
      principalCents: 5000000,
    },
  ];
  const draft = await services.createDraft(context(["sale.draft"]), {
    ...completeDraft(),
    ...extra,
    payments: payments.map((payment) => ({
      ...payment,
      dueAt: payment.dueAt ?? new Date("2026-07-14T12:00:00.000Z"),
      ...(salePaymentMethodUsesInstallments(payment.method)
        ? { installments: payment.installments ?? 1 }
        : {}),
    })),
  });
  return services.transition(context(["sale.close"]), {
    saleId: draft.id,
    status: "closed",
  });
}
