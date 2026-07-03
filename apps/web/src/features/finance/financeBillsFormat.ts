import type { FinanceRecurringEntry } from "./types";

const financeCategoryLabels: Record<string, string> = {
  Consignacao: "Consignação",
  Manutencao: "Manutenção",
  Servico: "Serviço",
  Veiculo: "Veículo",
  preparation: "Preparação",
  rent: "Aluguel",
  traffic: "Tráfego",
};

export function formatCurrency(valueCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(valueCents / 100);
}

export function formatDate(value: string | null) {
  if (!value) return "Sem vencimento";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
    new Date(value),
  );
}

export function recurrenceLabel(entry: FinanceRecurringEntry) {
  const frequency = {
    monthly: "Mensal",
    weekly: "Semanal",
    yearly: "Anual",
  } satisfies Record<FinanceRecurringEntry["frequency"], string>;
  return `${frequency[entry.frequency]} desde ${formatDate(entry.nextDueAt)}`;
}

export function formatFinanceCategory(category: string) {
  return financeCategoryLabels[category] ?? category;
}
