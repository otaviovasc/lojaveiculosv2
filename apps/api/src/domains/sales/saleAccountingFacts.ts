import { isActiveSalePaymentStatus } from "@lojaveiculosv2/shared";
import type { SalePaymentLine, SaleRecord } from "./ports/salesRepository.js";
import {
  saleFinancingRanks,
  type SaleFinancingRank,
} from "./saleSourceSnapshot.js";
import { SaleReadinessError } from "./services/SalesService/serviceSupport.js";

export type SaleAccountingFacts = {
  documentation: DocumentationFact | null;
  financing: readonly FinancingFact[];
  insurance: InsuranceFact | null;
  standardCommission: StandardCommissionFact | null;
  standardCommissionEnabled: boolean;
};

type DocumentationFact = {
  amountCents: number;
  hasLien: boolean;
};

type FinancingFact = {
  amountCents: number;
  paymentId: string;
  rank: SaleFinancingRank;
};

type InsuranceFact = {
  appliedCommissionPercentage: number;
  commissionAmountCents: number;
  financialProductId: string | null;
  premiumCents: number;
};

export type StandardCommissionFact = {
  amountCents?: number;
  calculatedAmountCents: number;
  percentageRate?: number;
  ruleType: "fixed" | "percentage";
};

export function requireSaleAccountingFacts(
  sale: SaleRecord,
): SaleAccountingFacts {
  const missing: string[] = [];
  const financing = readFinancingFacts(sale, missing);
  const documentation = readDocumentationFact(sale, missing);
  const insurance = readInsuranceFact(sale, missing);
  if (missing.length > 0) throw new SaleReadinessError(missing);
  return {
    documentation,
    financing,
    insurance,
    standardCommission: readStandardCommission(sale),
    standardCommissionEnabled:
      sale.saleSourceSnapshot.commission?.enabled === true,
  };
}

function readFinancingFacts(
  sale: SaleRecord,
  missing: string[],
): FinancingFact[] {
  const snapshot = readSnapshot(sale.saleSourceSnapshot.financing);
  if (snapshot?.status !== "approved") return [];
  const payments = sale.payments.filter(isActiveFinancingPayment);
  if (payments.length === 0) missing.push("financing_active_payment");
  return payments.flatMap((payment) => {
    const amountCents =
      readPositiveCents(payment.metadata.financedAmountCents) ??
      readPositiveCents(payment.metadata.financingValueCents) ??
      readPositiveCents(payment.principalCents);
    if (amountCents === null) {
      missing.push(`financing_payment_amount:${payment.id}`);
      return [];
    }
    return [
      {
        amountCents,
        paymentId: payment.id,
        rank: readFinancingRank(
          payment.metadata.financingRank ?? snapshot.rank,
        ),
      },
    ];
  });
}

function readDocumentationFact(
  sale: SaleRecord,
  missing: string[],
): DocumentationFact | null {
  const snapshot = readSnapshot(sale.saleSourceSnapshot.documentation);
  if (snapshot?.status !== "charged") return null;
  const amountCents = readPositiveCents(snapshot.chargedAmountCents);
  const hasLien = readBoolean(snapshot.hasLien);
  if (amountCents === null) missing.push("documentation_charged_amount");
  if (hasLien === null) missing.push("documentation_has_lien");
  return amountCents === null || hasLien === null
    ? null
    : { amountCents, hasLien };
}

function readInsuranceFact(
  sale: SaleRecord,
  missing: string[],
): InsuranceFact | null {
  const snapshot = readSnapshot(sale.saleSourceSnapshot.insurance);
  if (snapshot?.status !== "issued") return null;
  const premiumCents = readPositiveCents(snapshot.premiumCents);
  const appliedCommissionPercentage = readInsuranceCommissionPercentage(
    snapshot.appliedCommissionPercentage,
  );
  if (premiumCents === null) missing.push("insurance_premium");
  if (appliedCommissionPercentage === null) {
    missing.push("insurance_commission_rate");
  }
  if (premiumCents === null || appliedCommissionPercentage === null) {
    return null;
  }
  const commissionAmountCents = calculatePercentageCents(
    premiumCents,
    appliedCommissionPercentage,
  );
  if (commissionAmountCents <= 0) {
    missing.push("insurance_commission_amount");
    return null;
  }
  return {
    appliedCommissionPercentage,
    commissionAmountCents,
    financialProductId: readOptionalString(snapshot.financialProductId),
    premiumCents,
  };
}

function readStandardCommission(
  sale: SaleRecord,
): StandardCommissionFact | null {
  const commission = readSnapshot(sale.saleSourceSnapshot.commission);
  if (commission?.enabled !== true) return null;
  if (commission.ruleType === "fixed") {
    const amountCents = readPositiveCents(commission.amountValueCents);
    return amountCents === null
      ? null
      : { amountCents, calculatedAmountCents: amountCents, ruleType: "fixed" };
  }
  if (commission.ruleType !== "percentage") return null;
  const percentageRate = readPositivePercentage(commission.percentageRate);
  const salePriceCents = readPositiveCents(sale.salePriceCents);
  if (percentageRate === null || salePriceCents === null) return null;
  const calculatedAmountCents = calculatePercentageCents(
    salePriceCents,
    percentageRate,
  );
  if (calculatedAmountCents <= 0) return null;
  return {
    calculatedAmountCents,
    percentageRate,
    ruleType: "percentage",
  };
}

function isActiveFinancingPayment(payment: SalePaymentLine): boolean {
  return (
    payment.method === "financing" && isActiveSalePaymentStatus(payment.status)
  );
}

function calculatePercentageCents(
  amountCents: number,
  percentage: number,
): number {
  return Math.round((amountCents * percentage) / 100);
}

function readPositiveCents(value: unknown): number | null {
  return Number.isSafeInteger(value) && Number(value) > 0
    ? Number(value)
    : null;
}

function readSnapshot(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function readOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readFinancingRank(value: unknown): SaleFinancingRank {
  return saleFinancingRanks.includes(value as SaleFinancingRank)
    ? (value as SaleFinancingRank)
    : "R1";
}

function readInsuranceCommissionPercentage(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 10 &&
    value <= 20
    ? value
    : null;
}

function readPositivePercentage(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= 100
    ? value
    : null;
}
