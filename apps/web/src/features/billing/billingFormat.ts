import type { BillingEntitlementStatus, EntitlementKey } from "./types";

export const featureLabels: Record<EntitlementKey, string> = {
  analytics: "Relatorios",
  compliance: "Compliance",
  crm: "CRM",
  custom_domain: "Dominio proprio",
  external_api: "API externa",
  marketplace: "Marketplaces",
  nfe: "NF-e",
  plate_lookup: "Consulta placa",
  subdomain: "Subdominio",
};

export const featureValueCopy: Record<EntitlementKey, string> = {
  analytics: "Painel de indicadores para acompanhar vendas, funil e estoque.",
  compliance:
    "Controles operacionais para reduzir riscos em processos da loja.",
  crm: "Atendimento comercial integrado para organizar leads e conversas.",
  custom_domain: "Dominio proprio para deixar a vitrine publica com sua marca.",
  external_api: "API para conectar estoque, parceiros e automacoes externas.",
  marketplace: "Publicacao e sincronizacao com canais de venda externos.",
  nfe: "Emissao fiscal integrada aos fluxos comerciais da loja.",
  plate_lookup: "Consulta de placa para acelerar cadastro e conferencia.",
  subdomain: "Endereco publico padrao para colocar a loja online rapidamente.",
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
