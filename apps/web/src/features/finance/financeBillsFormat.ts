import type { FinanceRecurringEntry } from "./types";

const financeCategoryLabels: Record<string, string> = {
  Automático: "Automático",
  Comissao: "Comissão",
  Comissão: "Comissão",
  Consignacao: "Consignação",
  Manutencao: "Manutenção",
  Servico: "Serviço",
  Veiculo: "Veículo",
  commission: "Comissão",
  documentation: "Documentação",
  fuel: "Combustível",
  insurance: "Seguro",
  preparation: "Preparação",
  rent: "Aluguel",
  sale: "Venda",
  manual_bonus: "Bônus manual",
  sales_commission: "Comissão de venda",
  traffic: "Tráfego pago",
  vehicle_acquisition: "Aquisição de veículo",
  vehicle_fee: "Taxas do veículo",
  vehicle_inspection: "Inspeção veicular",
  vehicle_maintenance: "Manutenção do veículo",
  vehicle_other: "Outros (veículo)",
  vehicle_preparation: "Preparação do veículo",
  vehicle_repair: "Reparo do veículo",
  vehicle_reservation_signal: "Sinal de reserva",
  vehicle_sale: "Venda de veículo",
  vehicle_tax: "Impostos do veículo",
  vehicle_transport: "Transporte do veículo",
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
  const label = financeCategoryLabels[category];
  if (label) return label;
  const humanized = category
    .replace(/[_-]+/g, " ")
    .replace(/([a-zà-ú])([A-ZÀ-Ú])/g, "$1 $2")
    .trim();
  if (!humanized) return "Outros";
  return humanized.charAt(0).toUpperCase() + humanized.slice(1);
}
