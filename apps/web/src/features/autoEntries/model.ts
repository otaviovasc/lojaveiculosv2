import { financeAutoEntryMaxAmountCents } from "@lojaveiculosv2/shared";
import { formatCurrencyValue } from "../../lib/masks";
import { formatDecimal, parsePercentageToRatePpm } from "./numericModel";
import type {
  AutoEntryCalculation,
  AutoEntryDraftErrors,
  AutoEntryEvent,
  AutoEntryPercentageBasis,
  AutoEntryRule,
  AutoEntryRuleDraft,
  AutoEntryRuleInput,
  AutoEntryTiming,
} from "./types";

export const autoEntryEventOptions = [
  { label: "Venda concluída", value: "vehicle_sale_closed" },
  { label: "Financiamento aprovado", value: "financing_approved" },
  {
    label: "Documentação cobrada",
    value: "transfer_documentation_charged",
  },
  { label: "Seguro emitido", value: "insurance_issued" },
  { label: "Consórcio vendido", value: "consortium_sold" },
] as const;

export const autoEntryOutputOptions = [
  { label: "Comissão", value: "commission" },
  { label: "Receita", value: "revenue" },
  { label: "Despesa", value: "expense" },
] as const;

export const autoEntryCalculationOptions = [
  { label: "Valor fixo", value: "fixed" },
  { label: "Percentual", value: "percentage" },
] as const;

export const autoEntryTimingOptions = [
  { label: "No mesmo dia", value: "same_day" },
  { label: "Dias depois", value: "days_after" },
  { label: "Dia do mês", value: "day_of_month" },
  { label: "Dia do próximo mês", value: "next_month_day" },
] as const;

export function createAutoEntryDraft(
  event: AutoEntryEvent,
  rule: AutoEntryRule | null = null,
): AutoEntryRuleDraft {
  if (!rule) {
    return {
      amountReais: "",
      calculationBasis: basisForEvent(event),
      calculationKind: "fixed",
      category: event === "vehicle_sale_closed" ? "Comissão de venda" : "",
      event,
      metadata: {},
      name: "",
      outputType: event === "vehicle_sale_closed" ? "commission" : "revenue",
      percentage: "",
      percentageKind: "percentage",
      priority: "50",
      sellerUserId: "",
      status: "active",
      timingKind: "same_day",
      timingValue: "",
    };
  }

  return {
    amountReais:
      rule.calculation.kind === "fixed"
        ? formatCurrencyValue(rule.calculation.amountCents / 100)
        : "",
    calculationBasis:
      rule.calculation.kind === "fixed"
        ? basisForEvent(rule.event)
        : rule.calculation.basis,
    calculationKind: rule.calculation.kind === "fixed" ? "fixed" : "percentage",
    category: rule.category,
    event: rule.event,
    metadata: rule.metadata,
    name: rule.name,
    outputType: rule.outputType,
    percentage:
      rule.calculation.kind !== "fixed"
        ? formatDecimal(
            rule.calculation.kind === "percentage"
              ? rule.calculation.basisPoints / 100
              : rule.calculation.ratePpm / 10_000,
            rule.calculation.kind === "rate_ppm" ? 4 : 2,
          )
        : "",
    percentageKind:
      rule.calculation.kind === "rate_ppm" ? "rate_ppm" : "percentage",
    priority: String(rule.priority),
    sellerUserId: rule.sellerUserId ?? "",
    status: rule.status,
    timingKind: rule.timing.kind,
    timingValue: timingValue(rule.timing),
  };
}

export function validateAutoEntryDraft(draft: AutoEntryRuleDraft) {
  const errors: AutoEntryDraftErrors = {};
  if (!draft.name.trim()) errors.name = "Informe um nome para a regra.";
  else if (draft.name.trim().length > 191) {
    errors.name = "Use no máximo 191 caracteres.";
  }
  if (!draft.category.trim()) errors.category = "Informe uma categoria.";
  else if (draft.category.trim().length > 120) {
    errors.category = "Use no máximo 120 caracteres.";
  }
  if (
    draft.event === "vehicle_sale_closed" &&
    draft.outputType !== "commission"
  ) {
    errors.outputType = "Regras de venda geram apenas comissões auxiliares.";
  }

  const priority = Number(draft.priority);
  if (!Number.isInteger(priority) || priority < 0 || priority > 100) {
    errors.priority = "Use uma prioridade inteira entre 0 e 100.";
  }

  if (draft.calculationKind === "fixed") {
    const amountCents = parseMoneyToCents(draft.amountReais);
    if (amountCents === null) {
      errors.amountReais =
        "Use reais em formato brasileiro, até R$ 21.474.836,47.";
    } else if (amountCents <= 0) {
      errors.amountReais = "Informe um valor maior que zero.";
    }
  } else {
    const percentageValue =
      draft.percentageKind === "rate_ppm"
        ? parsePercentageToRatePpm(draft.percentage)
        : parsePercentageToBasisPoints(draft.percentage);
    if (
      percentageValue === null ||
      (draft.percentageKind === "percentage" &&
        (percentageValue < 1 || percentageValue > 10_000))
    ) {
      errors.percentage =
        draft.percentageKind === "rate_ppm"
          ? "Use um percentual entre 0,0001% e 100%."
          : "Use um percentual entre 0,01% e 100%.";
    }
  }

  if (draft.timingKind !== "same_day") {
    const value = Number(draft.timingValue);
    const maximum = draft.timingKind === "days_after" ? 365 : 31;
    if (!Number.isInteger(value) || value < 1 || value > maximum) {
      errors.timingValue = `Use um número inteiro entre 1 e ${maximum}.`;
    }
  }

  return errors;
}

export function buildAutoEntryRuleInput(
  draft: AutoEntryRuleDraft,
): AutoEntryRuleInput | null {
  if (Object.keys(validateAutoEntryDraft(draft)).length > 0) return null;
  let calculation: AutoEntryCalculation;
  if (draft.calculationKind === "fixed") {
    calculation = {
      amountCents: parseMoneyToCents(draft.amountReais) as number,
      kind: "fixed",
    };
  } else if (draft.percentageKind === "rate_ppm") {
    calculation = {
      basis: draft.calculationBasis,
      kind: "rate_ppm",
      ratePpm: parsePercentageToRatePpm(draft.percentage) as number,
    };
  } else {
    calculation = {
      basis: draft.calculationBasis,
      basisPoints: parsePercentageToBasisPoints(draft.percentage) as number,
      kind: "percentage",
    };
  }

  return {
    calculation,
    category: draft.category.trim(),
    event: draft.event,
    metadata: draft.metadata,
    name: draft.name.trim(),
    outputType: draft.outputType,
    priority: Number(draft.priority),
    sellerUserId: draft.sellerUserId || null,
    status: draft.status,
    timing: buildTiming(draft),
  };
}

export function basisForEvent(event: AutoEntryEvent): AutoEntryPercentageBasis {
  if (event === "financing_approved") return "financing";
  if (event === "transfer_documentation_charged") return "documentation";
  if (event === "insurance_issued") return "premium";
  if (event === "consortium_sold") return "consortium";
  return "sale";
}

function buildTiming(draft: AutoEntryRuleDraft): AutoEntryTiming {
  if (draft.timingKind === "same_day") return { kind: "same_day" };
  if (draft.timingKind === "days_after") {
    return { days: Number(draft.timingValue), kind: "days_after" };
  }
  return { day: Number(draft.timingValue), kind: draft.timingKind };
}

function timingValue(timing: AutoEntryTiming) {
  if (timing.kind === "same_day") return "";
  return String(timing.kind === "days_after" ? timing.days : timing.day);
}

export function parseMoneyToCents(value: string) {
  const match = /^(?:(\d+)|(\d{1,3}(?:\.\d{3})+))(?:,(\d{1,2}))?$/.exec(
    value.trim(),
  );
  if (!match) return null;
  const wholeDigits = (match[1] ?? match[2] ?? "").replace(/\./g, "");
  const wholeReais = Number(wholeDigits);
  const fractionalCents = Number((match[3] ?? "").padEnd(2, "0"));
  const cents = wholeReais * 100 + fractionalCents;
  return Number.isSafeInteger(cents) && cents <= financeAutoEntryMaxAmountCents
    ? cents
    : null;
}

export function parsePercentageToBasisPoints(value: string) {
  const match = /^(\d+)(?:[,.](\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const wholePercentage = Number(match[1]);
  const fractionalBasisPoints = Number((match[2] ?? "").padEnd(2, "0"));
  const basisPoints = wholePercentage * 100 + fractionalBasisPoints;
  return Number.isSafeInteger(basisPoints) ? basisPoints : null;
}
