import type { BillingEntitlementStatus, EntitlementKey } from "./types";

export const featureLabels: Record<EntitlementKey, string> = {
  analytics: "Relatórios",
  automation: "Operador IA",
  compliance: "Compliance",
  crm: "CRM",
  custom_domain: "Domínio próprio",
  external_api: "API externa",
  marketplace: "Marketplaces",
  nfe: "NF-e",
  plate_lookup: "Consulta placa",
  simulations: "Simulações",
  subdomain: "Subdomínio",
};

export const featureValueCopy: Record<EntitlementKey, string> = {
  analytics: "Painel de indicadores para acompanhar vendas, funil e estoque.",
  automation:
    "Prévias versionadas com revisão humana antes de qualquer execução assistida.",
  compliance:
    "Controles operacionais para reduzir riscos em processos da loja.",
  crm: "Atendimento comercial integrado para organizar leads e conversas.",
  custom_domain: "Domínio próprio para deixar a vitrine pública com sua marca.",
  external_api: "API para conectar estoque, parceiros e automações externas.",
  marketplace: "Publicação e sincronização com canais de venda externos.",
  nfe: "Emissão fiscal integrada aos fluxos comerciais da loja.",
  plate_lookup: "Consulta de placa para acelerar cadastro e conferência.",
  simulations: "Cenários comerciais assistidos antes de fechar a proposta.",
  subdomain: "Endereço público padrão para colocar a loja online rapidamente.",
};

export const statusLabels: Record<BillingEntitlementStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
  suspended: "Suspenso",
  trialing: "Em teste",
};

export function isEnabled(status: BillingEntitlementStatus) {
  return status === "active" || status === "trialing";
}

export function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(cents / 100);
}
