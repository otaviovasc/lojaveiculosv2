import type { FinanceRecurringEntry } from "./types";

const financeCategoryLabels: Record<string, string> = {
  Consignacao: "Consignação",
  Manutencao: "Manutenção",
  Servico: "Serviço",
  Veiculo: "Veículo",
  preparation: "Preparação",
  rent: "Aluguel",
  manual_bonus: "Bônus manual",
  sales_commission: "Comissão de venda",
  traffic: "Tráfego",
  vehicle_acquisition: "Aquisição",
  vehicle_fee: "Taxas",
  vehicle_inspection: "Inspeção",
  vehicle_maintenance: "Manutenção",
  vehicle_other: "Outros",
  vehicle_preparation: "Preparação",
  vehicle_repair: "Reparo",
  vehicle_reservation_signal: "Sinal de reserva",
  vehicle_sale: "Venda de veículo",
  vehicle_tax: "Impostos",
  vehicle_transport: "Transporte",
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
