import type { FinanceAutoEntryRule } from "../../ports/financeAutoEntryRepository.js";

export function financeAutoEntryRuleCategory(
  rule: Pick<FinanceAutoEntryRule, "category" | "event" | "outputType">,
): string {
  if (rule.category) return rule.category;
  if (rule.outputType === "commission") return "Comissão";
  if (rule.event === "consortium_sold") return "Consórcio";
  if (rule.event === "financing_approved") return "Financiamento";
  if (rule.event === "insurance_issued") return "Seguro";
  if (rule.event === "transfer_documentation_charged") return "Documentação";
  return "Venda";
}

export function financeAutoEntryRuleName(
  rule: Pick<FinanceAutoEntryRule, "event" | "name">,
): string {
  if (rule.name) return rule.name;
  const eventName = {
    consortium_sold: "consórcio vendido",
    financing_approved: "financiamento aprovado",
    insurance_issued: "seguro emitido",
    transfer_documentation_charged: "documentação de transferência cobrada",
    vehicle_sale_closed: "venda concluída",
  }[rule.event];
  return `Lançamento automático: ${eventName}`;
}
