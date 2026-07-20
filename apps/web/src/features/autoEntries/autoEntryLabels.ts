import type {
  AutoEntryCalculation,
  AutoEntryConditions,
  AutoEntryEvent,
  AutoEntryOutputType,
  AutoEntryPercentageBasis,
  AutoEntryTiming,
} from "./types";

export function autoEntryEventLabel(event: AutoEntryEvent) {
  if (event === "financing_approved") return "Financiamento aprovado";
  if (event === "insurance_issued") return "Seguro emitido";
  if (event === "transfer_documentation_charged") {
    return "Documentação cobrada";
  }
  if (event === "consortium_sold") return "Consórcio vendido";
  return "Venda concluída";
}

export function autoEntryOutputLabel(outputType: AutoEntryOutputType) {
  if (outputType === "expense") return "Despesa";
  if (outputType === "revenue") return "Receita";
  return "Comissão";
}

export function autoEntryPercentageBasisLabel(basis: AutoEntryPercentageBasis) {
  if (basis === "financing") return "Valor financiado";
  if (basis === "premium") return "Prêmio do seguro";
  if (basis === "insurance_commission") return "Comissão da seguradora";
  if (basis === "documentation") return "Cobrança da documentação";
  if (basis === "consortium") return "Carta de crédito";
  if (basis === "commission") return "Comissão informada na venda";
  return "Valor da venda";
}

export function autoEntryCalculationLabel(calculation: AutoEntryCalculation) {
  if (calculation.kind === "fixed") return money(calculation.amountCents);
  const rate =
    calculation.kind === "percentage"
      ? calculation.basisPoints / 10_000
      : calculation.ratePpm / 1_000_000;
  return `${formatPercentage(rate)} sobre ${basisLabel(calculation.basis)}`;
}

export function autoEntryTimingLabel(timing: AutoEntryTiming) {
  if (timing.kind === "same_day") return "No mesmo dia";
  if (timing.kind === "days_after") {
    return `${timing.days} ${timing.days === 1 ? "dia" : "dias"} depois`;
  }
  if (timing.kind === "next_month_day") {
    return `Dia ${timing.day} do próximo mês`;
  }
  return `Dia ${timing.day} do mês`;
}

/**
 * Human label for the value range a rule applies to. Only basis ranges carry
 * user-meaningful scope not already present in the rule name (financing rank
 * and gravame flags are repeated in the name, so they stay out).
 */
export function autoEntryConditionLabel(
  conditions: AutoEntryConditions | undefined,
) {
  const range = conditions?.basisRange;
  if (!range || (range.minCents === undefined && range.maxCents == null)) {
    return null;
  }
  const min =
    range.minCents === undefined ? "Sem mínimo" : money(range.minCents);
  const max = range.maxCents == null ? "sem limite" : money(range.maxCents);
  return `${min} – ${max}`;
}

function basisLabel(basis: AutoEntryPercentageBasis) {
  if (basis === "financing") return "o valor financiado";
  if (basis === "premium") return "o prêmio do seguro";
  if (basis === "insurance_commission") return "a comissão da seguradora";
  if (basis === "documentation") return "a cobrança da documentação";
  if (basis === "consortium") return "a carta de crédito";
  if (basis === "commission") return "a comissão informada na venda";
  return "o valor da venda";
}

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(cents / 100);
}

function formatPercentage(rate: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 4,
    minimumFractionDigits: 0,
    style: "percent",
  }).format(rate);
}
