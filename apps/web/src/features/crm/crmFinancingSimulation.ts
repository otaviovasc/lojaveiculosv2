import type { FinancingSimulationDraft } from "./crmLeadData";

const brlFormatter = new Intl.NumberFormat("pt-BR", {
  currency: "BRL",
  style: "currency",
});

export function formatFinancingValue(value: number) {
  return brlFormatter.format(Number.isFinite(value) ? value : 0);
}

export function calculateFinancing(
  vehicleValue: number,
  downpayment: number,
  months: number,
  interestRate: number,
) {
  const principal = Math.max(0, vehicleValue - downpayment);
  if (!Number.isFinite(principal) || months <= 0) {
    return { financedAmount: 0, monthlyPayment: 0, totalFinanced: 0 };
  }
  const rate = interestRate / 100;
  if (rate === 0) {
    return {
      financedAmount: principal,
      monthlyPayment: principal / months,
      totalFinanced: principal,
    };
  }
  const growth = Math.pow(1 + rate, months);
  const monthlyPayment = (principal * rate * growth) / (growth - 1);
  return {
    financedAmount: principal,
    monthlyPayment,
    totalFinanced: monthlyPayment * months,
  };
}

export function createFinancingDraft(input: {
  downpayment: number;
  interestRate: number;
  monthlyPayment: number;
  months: number;
  vehicleValue: number;
}): FinancingSimulationDraft {
  return {
    downpaymentCents: Math.round(input.downpayment * 100),
    interestRate: input.interestRate,
    monthlyPaymentCents: Math.round(input.monthlyPayment * 100),
    months: input.months,
    vehicleValueCents: Math.round(input.vehicleValue * 100),
  };
}
