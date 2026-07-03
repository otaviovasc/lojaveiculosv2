export type SaleStatus = "draft" | "pending" | "closed" | "cancelled";
export type SalePaymentStatus = "pending" | "paid" | "refunded" | "cancelled";

export type SalePaymentLine = {
  amountCents: number;
  dueAt: Date | null;
  extraCents: number;
  id: string;
  installments: number | null;
  metadata: Record<string, unknown>;
  method: string;
  paidAt: Date | null;
  principalCents: number;
  providerPaymentId: string | null;
  status: SalePaymentStatus;
};

export type SaleRecord = {
  buyerSnapshot: Record<string, unknown>;
  closedAt: Date | null;
  correctionOfSaleId: string | null;
  createdAt: Date;
  documentPolicySnapshot: Record<string, unknown>;
  id: string;
  isCurrentRevision: boolean;
  leadId: string | null;
  listingSnapshot: Record<string, unknown>;
  overrideReason: string | null;
  overrideRequiredFields: boolean;
  payments: readonly SalePaymentLine[];
  revision: number;
  salePriceCents: number | null;
  saleSourceSnapshot: Record<string, unknown>;
  selectedDocumentKinds: readonly string[];
  sellerUserId: string | null;
  status: SaleStatus;
  storeId: string;
  tenantId: string;
  unitId: string | null;
  updatedAt: Date;
};

export type SaleScope = {
  storeId: string;
  tenantId: string;
};

export type SaveSaleDraftInput = {
  buyerSnapshot?: Record<string, unknown>;
  documentPolicySnapshot?: Record<string, unknown>;
  leadId?: string | null;
  listingSnapshot?: Record<string, unknown>;
  payments?: readonly SaveSalePaymentInput[];
  salePriceCents?: number | null;
  saleSourceSnapshot?: Record<string, unknown>;
  selectedDocumentKinds?: readonly string[];
  sellerUserId?: string | null;
  unitId?: string | null;
};

export type UpdateSaleDraftInput = SaveSaleDraftInput;

export type SaveSalePaymentInput = {
  amountCents: number;
  dueAt?: Date | null;
  extraCents?: number;
  installments?: number | null;
  metadata?: Record<string, unknown>;
  method: string;
  paidAt?: Date | null;
  principalCents?: number;
  providerPaymentId?: string | null;
  status?: SalePaymentStatus;
};

export type ListSalesInput = SaleScope & {
  leadId?: string | null;
  limit: number;
  offset: number;
  sellerUserId?: string | null;
  status?: SaleStatus | "all";
  unitId?: string | null;
};

export type TransitionSaleInput = SaleScope & {
  closedAt?: Date | null;
  overrideReason?: string | null;
  overrideRequiredFields?: boolean;
  saleId: string;
  status: Exclude<SaleStatus, "draft">;
};

export type SalesRepository = {
  createDraft: (
    scope: SaleScope,
    input: SaveSaleDraftInput,
  ) => Promise<SaleRecord>;
  deleteDraft: (scope: SaleScope, saleId: string) => Promise<SaleRecord>;
  findById: (scope: SaleScope, saleId: string) => Promise<SaleRecord | null>;
  list: (input: ListSalesInput) => Promise<readonly SaleRecord[]>;
  transition: (input: TransitionSaleInput) => Promise<SaleRecord>;
  updateDraft: (
    scope: SaleScope,
    saleId: string,
    input: UpdateSaleDraftInput,
  ) => Promise<SaleRecord>;
};
