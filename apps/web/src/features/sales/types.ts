import type {
  SalePaymentMethod,
  SalePaymentStatus,
} from "@lojaveiculosv2/shared";

export type SaleStatus = "draft" | "pending" | "closed" | "cancelled";
export type { SalePaymentStatus } from "@lojaveiculosv2/shared";
export type SaleDocumentKind =
  "delivery_term" | "power_of_attorney" | "sale_contract" | "sale_receipt";
export const saleFinancingRanks = ["R1", "R2", "R3", "R4", "R5"] as const;
export type SaleFinancingRank = (typeof saleFinancingRanks)[number];

export type SaleFinancingSnapshot = Record<string, unknown> & {
  bankName?: string;
  financedAmountCents?: number | null;
  installmentAmountCents?: number | null;
  installmentsCount?: number | null;
  interestRatePercentage?: number | null;
  rank?: SaleFinancingRank | null;
  status?: "approved" | "pending" | "rejected";
};

export type SaleInsuranceSnapshot = Record<string, unknown> & {
  appliedCommissionPercentage?: number | null;
  brokerName?: string;
  companyName?: string;
  premiumCents?: number | null;
  status?: "cancelled" | "issued" | "pending";
  validUntil?: string | null;
};

export type SaleDocumentationSnapshot = Record<string, unknown> & {
  chargedAmountCents?: number | null;
  hasLien?: boolean | null;
  notes?: string;
  status?: "cancelled" | "charged" | "pending";
};

export type SaleCommissionSnapshot = Record<string, unknown> & {
  amountValueCents?: number | null;
  enabled?: boolean;
  notes?: string;
  percentageRate?: number | null;
  ruleType?: "fixed" | "margin" | "percentage";
};

export type SaleSourceSnapshot = Record<string, unknown> & {
  commission?: SaleCommissionSnapshot;
  documentation?: SaleDocumentationSnapshot;
  financing?: SaleFinancingSnapshot;
  insurance?: SaleInsuranceSnapshot;
  source?: string;
};

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
  saleSourceSnapshot: SaleSourceSnapshot;
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
  saleSourceSnapshot?: SaleSourceSnapshot;
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
