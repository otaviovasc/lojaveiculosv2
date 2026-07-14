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
  financialProductId?: string | null;
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
