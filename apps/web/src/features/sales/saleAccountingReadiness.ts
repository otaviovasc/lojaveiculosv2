import {
  isActiveSalePaymentStatus,
  salePaymentMethodUsesInstallments,
} from "@lojaveiculosv2/shared";
import type { SaleRecord } from "./types";

export function saleAccountingMissingFields(sale: SaleRecord): string[] {
  const missing: string[] = [];
  const activePayments = sale.payments.filter((payment) =>
    isActiveSalePaymentStatus(payment.status),
  );
  if (activePayments.some((payment) => !payment.dueAt)) {
    missing.push("Data dos pagamentos");
  }
  if (
    activePayments.some(
      (payment) =>
        salePaymentMethodUsesInstallments(payment.method) &&
        (!payment.installments || payment.installments < 1),
    )
  ) {
    missing.push("Quantidade de parcelas");
  }

  const financing = sale.saleSourceSnapshot.financing;
  if (financing?.status === "approved") {
    const payments = sale.payments.filter(
      (payment) =>
        payment.method === "financing" &&
        isActiveSalePaymentStatus(payment.status),
    );
    if (payments.length === 0) {
      missing.push("Pagamento de financiamento");
    } else if (
      payments.some(
        (payment) =>
          readPositiveCents(payment.metadata.financedAmountCents) === null &&
          readPositiveCents(payment.metadata.financingValueCents) === null &&
          readPositiveCents(payment.principalCents) === null,
      )
    ) {
      missing.push("Valor financiado");
    }
  }

  const documentation = sale.saleSourceSnapshot.documentation;
  if (documentation?.status === "charged") {
    if (readPositiveCents(documentation.chargedAmountCents) === null) {
      missing.push("Valor da documentação");
    }
    if (typeof documentation.hasLien !== "boolean") {
      missing.push("Gravame da documentação");
    }
  }

  const insurance = sale.saleSourceSnapshot.insurance;
  if (insurance?.status === "issued") {
    const premiumCents = readPositiveCents(insurance.premiumCents);
    const percentage = readInsuranceCommissionPercentage(
      insurance.appliedCommissionPercentage,
    );
    if (premiumCents === null) missing.push("Prêmio do seguro");
    if (percentage === null) {
      missing.push("Percentual de comissão do seguro");
    } else if (
      premiumCents !== null &&
      Math.round((premiumCents * percentage) / 100) <= 0
    ) {
      missing.push("Valor da comissão do seguro");
    }
  }

  return missing;
}

function readPositiveCents(value: unknown): number | null {
  return Number.isSafeInteger(value) && Number(value) > 0
    ? Number(value)
    : null;
}

function readInsuranceCommissionPercentage(value: unknown): number | null {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 10 &&
    value <= 20
    ? value
    : null;
}
