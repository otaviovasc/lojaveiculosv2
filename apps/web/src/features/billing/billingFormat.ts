import type { BillingEntitlementStatus, EntitlementKey } from "./types";

export const featureLabels: Record<EntitlementKey, string> = {
  analytics: "Relatórios",
  ai: "Inteligência artificial",
  automation: "Automação avançada",
  checklists: "Checklists",
  commissions: "Comissões",
  compliance: "Compliance",
  crm: "CRM",
  custom_domain: "Domínio próprio",
  documents: "Central de documentos",
  external_api: "API externa",
  finance: "Financeiro",
  financing: "Financiamento",
  fiscal: "Fiscal",
  inventory: "Estoque",
  lead_capture: "Captura de interessados",
  marketplace: "Marketplaces",
  plate_lookup: "Consulta placa",
  sales: "Reservas e vendas",
  storefront: "Vitrine digital",
};

export const featureValueCopy: Record<EntitlementKey, string> = {
  analytics: "Painel de indicadores para acompanhar vendas, funil e estoque.",
  ai: "AI Studio e análise inteligente de revenda.",
  automation:
    "Prévias versionadas com revisão humana antes de qualquer execução assistida.",
  checklists: "Rotinas operacionais padronizadas para a equipe.",
  commissions: "Regras, acompanhamento e liquidação de comissões.",
  compliance:
    "Controles operacionais para reduzir riscos em processos da loja.",
  crm: "Atendimento comercial integrado para organizar leads e conversas.",
  custom_domain: "Domínio próprio para deixar a vitrine pública com sua marca.",
  documents: "Uploads, modelos, personalização e regeneração de documentos.",
  external_api: "API para conectar estoque, parceiros e automações externas.",
  finance: "Contas, lançamentos e visão financeira da operação.",
  financing: "Fluxo interno e provedor conectado quando verificado.",
  fiscal: "Emissão fiscal integrada aos fluxos comerciais da loja.",
  inventory: "Cadastro, publicação e controle do estoque da loja.",
  lead_capture: "Interesses da vitrine organizados em uma caixa de entrada.",
  marketplace: "Publicação e sincronização com canais de venda externos.",
  plate_lookup: "Consulta de placa para acelerar cadastro e conferência.",
  sales: "Reservas, clientes e fechamento de vendas.",
  storefront: "Construtor completo no subdomínio Loja Veículos.",
};

export const statusLabels: Record<BillingEntitlementStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
  suspended: "Suspenso",
  trialing: "Contrato legado",
};

export function isEnabled(status: BillingEntitlementStatus) {
  return status === "active";
}

export function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(cents / 100);
}
