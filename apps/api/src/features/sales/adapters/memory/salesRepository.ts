import type {
  ListSalesInput,
  SalePaymentLine,
  SaleRecord,
  SalesRepository,
  SaleScope,
  SaveSaleDraftInput,
  SaveSalePaymentInput,
  TransitionSaleInput,
} from "../../../../domains/sales/ports/salesRepository.js";

export function createMemorySalesRepository(): SalesRepository {
  const sales = new Map<string, SaleRecord>();

  return {
    async createDraft(scope, input) {
      const now = new Date();
      const sale: SaleRecord = {
        buyerSnapshot: input.buyerSnapshot ?? {},
        closedAt: null,
        correctionOfSaleId: null,
        createdAt: now,
        documentPolicySnapshot: input.documentPolicySnapshot ?? {},
        id: randomId(),
        isCurrentRevision: true,
        leadId: input.leadId ?? null,
        listingId: input.listingId ?? null,
        listingSnapshot: input.listingSnapshot ?? {},
        overrideReason: null,
        overrideRequiredFields: false,
        payments: mapPayments(input.payments ?? []),
        revision: 1,
        salePriceCents: input.salePriceCents ?? null,
        saleSourceSnapshot: input.saleSourceSnapshot ?? {},
        selectedDocumentKinds: [...(input.selectedDocumentKinds ?? [])],
        sellerUserId: input.sellerUserId ?? null,
        status: "draft",
        storeId: scope.storeId,
        tenantId: scope.tenantId,
        unitId: input.unitId ?? null,
        updatedAt: now,
      };
      sales.set(sale.id, sale);
      return sale;
    },
    async findById(scope, saleId) {
      const sale = sales.get(saleId);
      if (!sale || !matchesScope(sale, scope)) return null;
      return sale;
    },
    async list(input) {
      return [...sales.values()]
        .filter((sale) => matchesList(sale, input))
        .sort(
          (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
        )
        .slice(input.offset, input.offset + input.limit);
    },
    async transition(input) {
      const current = sales.get(input.saleId);
      if (!current || !matchesScope(current, input)) {
        throw new Error(`Sale not found: ${input.saleId}`);
      }
      const next = {
        ...current,
        closedAt: input.closedAt ?? null,
        overrideReason: input.overrideReason ?? null,
        overrideRequiredFields: input.overrideRequiredFields ?? false,
        status: input.status,
        updatedAt: new Date(),
      };
      sales.set(input.saleId, next);
      return next;
    },
    async updateDraft(scope, saleId, input) {
      const current = sales.get(saleId);
      if (!current || !matchesScope(current, scope)) {
        throw new Error(`Sale not found: ${saleId}`);
      }
      const next = mergeSaleInput(current, input);
      sales.set(saleId, next);
      return next;
    },
  };
}

function mergeSaleInput(
  current: SaleRecord,
  input: SaveSaleDraftInput,
): SaleRecord {
  return {
    ...current,
    buyerSnapshot: input.buyerSnapshot ?? current.buyerSnapshot,
    documentPolicySnapshot:
      input.documentPolicySnapshot ?? current.documentPolicySnapshot,
    leadId: input.leadId !== undefined ? input.leadId : current.leadId,
    listingId:
      input.listingId !== undefined ? input.listingId : current.listingId,
    listingSnapshot: input.listingSnapshot ?? current.listingSnapshot,
    payments: input.payments ? mapPayments(input.payments) : current.payments,
    salePriceCents:
      input.salePriceCents !== undefined
        ? input.salePriceCents
        : current.salePriceCents,
    saleSourceSnapshot: input.saleSourceSnapshot ?? current.saleSourceSnapshot,
    selectedDocumentKinds:
      input.selectedDocumentKinds ?? current.selectedDocumentKinds,
    sellerUserId:
      input.sellerUserId !== undefined
        ? input.sellerUserId
        : current.sellerUserId,
    unitId: input.unitId !== undefined ? input.unitId : current.unitId,
    updatedAt: new Date(),
  };
}

function mapPayments(
  payments: readonly SaveSalePaymentInput[],
): readonly SalePaymentLine[] {
  return payments.map((payment) => ({
    amountCents: payment.amountCents,
    dueAt: payment.dueAt ?? null,
    extraCents: payment.extraCents ?? 0,
    id: randomId(),
    installments: payment.installments ?? null,
    metadata: payment.metadata ?? {},
    method: payment.method,
    paidAt: payment.paidAt ?? null,
    principalCents: payment.principalCents ?? payment.amountCents,
    providerPaymentId: payment.providerPaymentId ?? null,
    status: payment.status ?? "pending",
  }));
}

function matchesList(sale: SaleRecord, input: ListSalesInput): boolean {
  return (
    matchesScope(sale, input) &&
    (input.status === "all" || !input.status || sale.status === input.status) &&
    (!input.leadId || sale.leadId === input.leadId) &&
    (!input.unitId || sale.unitId === input.unitId) &&
    (!input.sellerUserId || sale.sellerUserId === input.sellerUserId)
  );
}

function matchesScope(sale: SaleRecord, scope: SaleScope): boolean {
  return sale.storeId === scope.storeId && sale.tenantId === scope.tenantId;
}

function randomId(): string {
  return crypto.randomUUID();
}
