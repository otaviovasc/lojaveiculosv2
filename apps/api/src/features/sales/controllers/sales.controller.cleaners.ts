import type { z } from "zod";
import type {
  ListSalesInput,
  SaveSaleDraftInput,
  SaveSalePaymentInput,
  UpdateSaleDraftInput,
} from "../../../domains/sales/ports/salesRepository.js";
import type {
  listSalesQuerySchema,
  saleDraftSchema,
  salePaymentSchema,
  transitionSaleSchema,
} from "./sales.controller.schemas.js";

export function cleanCreateSaleDraftInput(
  input: z.infer<typeof saleDraftSchema>,
): SaveSaleDraftInput {
  const draft: UpdateSaleDraftInput = {};
  cleanSaleDraftFields(draft, input, false);
  return draft;
}

export function cleanUpdateSaleDraftInput(
  input: z.infer<typeof saleDraftSchema>,
): UpdateSaleDraftInput {
  const draft: UpdateSaleDraftInput = {};
  cleanSaleDraftFields(draft, input, true);
  return draft;
}

function cleanSaleDraftFields(
  draft: UpdateSaleDraftInput,
  input: z.infer<typeof saleDraftSchema>,
  preservePaymentIds: boolean,
): void {
  assignDefined(draft, "buyerSnapshot", input.buyerSnapshot);
  assignDefined(draft, "documentPolicySnapshot", input.documentPolicySnapshot);
  assignDefined(draft, "leadId", input.leadId);
  assignDefined(draft, "listingSnapshot", input.listingSnapshot);
  assignDefined(
    draft,
    "payments",
    input.payments?.map((payment) =>
      cleanSalePaymentInput(payment, preservePaymentIds),
    ),
  );
  assignDefined(draft, "salePriceCents", input.salePriceCents);
  assignDefined(draft, "saleSourceSnapshot", input.saleSourceSnapshot);
  assignDefined(draft, "selectedDocumentKinds", input.selectedDocumentKinds);
  assignDefined(draft, "sellerUserId", input.sellerUserId);
  assignDefined(draft, "unitId", input.unitId);
}

export function cleanListSalesQuery(
  input: z.infer<typeof listSalesQuerySchema>,
): Omit<ListSalesInput, "storeId" | "tenantId"> {
  const query: Omit<ListSalesInput, "storeId" | "tenantId"> = {
    limit: input.limit,
    offset: input.offset,
    status: input.status,
  };
  assignDefined(query, "leadId", input.leadId);
  assignDefined(query, "sellerUserId", input.sellerUserId);
  assignDefined(query, "unitId", input.unitId);
  return query;
}

export function cleanTransitionInput(
  input: z.infer<typeof transitionSaleSchema>,
): {
  overrideReason?: string | null;
  overrideRequiredFields?: boolean;
} {
  const transition: {
    overrideReason?: string | null;
    overrideRequiredFields?: boolean;
  } = {};
  assignDefined(transition, "overrideReason", input.overrideReason);
  assignDefined(
    transition,
    "overrideRequiredFields",
    input.overrideRequiredFields,
  );
  return transition;
}

function assignDefined<T extends object, K extends keyof T>(
  target: T,
  key: K,
  value: T[K] | undefined,
): void {
  if (value !== undefined) target[key] = value;
}

function cleanSalePaymentInput(
  input: z.infer<typeof salePaymentSchema>,
  preserveId: boolean,
): SaveSalePaymentInput {
  const payment: SaveSalePaymentInput = {
    amountCents: input.amountCents,
    method: input.method,
  };
  assignDefined(payment, "dueAt", input.dueAt);
  assignDefined(payment, "extraCents", input.extraCents);
  if (preserveId) assignDefined(payment, "id", input.id);
  assignDefined(payment, "installments", input.installments);
  assignDefined(payment, "metadata", input.metadata);
  assignDefined(payment, "paidAt", input.paidAt);
  assignDefined(payment, "principalCents", input.principalCents);
  assignDefined(payment, "providerPaymentId", input.providerPaymentId);
  assignDefined(payment, "status", input.status);
  return payment;
}
