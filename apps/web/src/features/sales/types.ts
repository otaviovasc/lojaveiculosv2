import type {
  SalePaymentMethod,
  SalePaymentStatus,
} from "@lojaveiculosv2/shared";

export type SaleStatus = "draft" | "pending" | "closed" | "cancelled";
export type { SalePaymentStatus } from "@lojaveiculosv2/shared";
export type SaleDocumentKind =
  "delivery_term" | "power_of_attorney" | "sale_contract" | "sale_receipt";

export type SalesAuth = {
  accessToken?: string | null;
  clerkUserId?: string | null;
  storeSlug?: string | null;
};

export type SalePaymentLine = {
  amountCents: number;
  dueAt: string | null;
  extraCents: number;
  id: string;
  installments: number | null;
  metadata: Record<string, unknown>;
  method: SalePaymentMethod;
  paidAt: string | null;
  principalCents: number;
  providerPaymentId: string | null;
  status: SalePaymentStatus;
};

export type SaleRecord = {
  buyerSnapshot: Record<string, unknown>;
  closedAt: string | null;
  correctionOfSaleId: string | null;
  createdAt: string;
  documentPolicySnapshot: Record<string, unknown>;
  id: string;
  isCurrentRevision: boolean;
  leadId: string | null;
  listingId: string | null;
  listingSnapshot: Record<string, unknown>;
  overrideReason: string | null;
  overrideRequiredFields: boolean;
  payments: readonly SalePaymentLine[];
  revision: number;
  salePriceCents: number | null;
  saleSourceSnapshot: Record<string, unknown>;
  selectedDocumentKinds: readonly SaleDocumentKind[];
  sellerUserId: string | null;
  status: SaleStatus;
  unitId: string | null;
  updatedAt: string;
};

export type SaleDraftInput = {
  buyerSnapshot?: Record<string, unknown>;
  documentPolicySnapshot?: Record<string, unknown>;
  leadId?: string | null;
  listingId?: string | null;
  listingSnapshot?: Record<string, unknown>;
  payments?: readonly SalePaymentInput[];
  salePriceCents?: number | null;
  saleSourceSnapshot?: Record<string, unknown>;
  selectedDocumentKinds?: readonly SaleDocumentKind[];
  sellerUserId?: string | null;
  unitId?: string | null;
};

export type SalePaymentInput = {
  amountCents: number;
  extraCents?: number;
  id?: string;
  installments?: number | null;
  metadata?: Record<string, unknown>;
  method: SalePaymentMethod;
  principalCents?: number;
  status?: SalePaymentStatus;
};

export type SalesListQuery = {
  leadId?: string;
  offset?: number;
  sellerUserId?: string;
  status?: SaleStatus | "all";
  unitId?: string;
};

export type SaleStartContext = {
  buyerEmail?: string;
  buyerName?: string;
  buyerPhone?: string;
  leadId?: string;
  listingId?: string;
  listingTitle?: string;
  priceCents?: number;
  unitId?: string;
  unitLabel?: string;
  plate?: string;
  colorName?: string;
  primaryMediaUrl?: string;
};
