import type {
  BillingEntitlementStatus,
  BillingPlan,
  EntitlementKey,
} from "./types";

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

export const billingCapabilityLabels: Readonly<Record<string, string>> = {
  advanced_automation: "Automação avançada",
  ai_studio: "AI Studio",
  analytics: "Indicadores e análises",
  basic_lead_inbox: "Caixa de entrada básica",
  byok_zapi: "Z-API com credenciais próprias",
  checklists: "Checklists operacionais",
  commissions: "Comissões",
  compliance: "Compliance",
  connected_financing_when_verified:
    "Financiamento conectado quando verificado",
  custom_domain: "Domínio próprio",
  customers: "Gestão de clientes",
  document_templates: "Modelos de documentos",
  document_workspace: "Central de documentos",
  finance: "Gestão financeira",
  finance_auto_entry_rules: "Regras de lançamentos automáticos",
  fiscal: "Gestão fiscal",
  full_crm: "CRM completo",
  internal_financing_workflow: "Fluxo interno de financiamento",
  marketplaces: "Marketplaces",
  official_channels: "Canais oficiais",
  public_api_and_webhooks: "Public API e webhooks",
  public_interest_capture: "Captura pública de interessados",
  reservations_and_sales: "Reservas e vendas",
  resale_analysis_ai: "Análise inteligente de revenda",
  storefront_builder: "Construtor completo da vitrine",
  vehicle_listing_control: "Cadastro e controle de veículos",
};

export function planCapabilityHighlights(
  plan: BillingPlan,
  previousPlan: BillingPlan | null,
) {
  const previous = new Set(previousPlan?.capabilities ?? []);
  const additions = plan.capabilities.filter(
    (capability) => !previous.has(capability),
  );
  return [
    ...(previousPlan ? [`Tudo do ${previousPlan.name}`] : []),
    ...additions.map(
      (capability) =>
        billingCapabilityLabels[capability] ?? capability.replaceAll("_", " "),
    ),
  ];
}

export function planLimitHighlights(plan: BillingPlan) {
  const plateLimit = plan.features.find(
    (feature) => feature.featureKey === "plate_lookup",
  )?.limitValue;
  return [
    plan.limits.vehicleLimit == null
      ? "Limite de veículos sob proposta"
      : `Até ${plan.limits.vehicleLimit.toLocaleString("pt-BR")} veículos em estoque`,
    plan.limits.sellerLimit == null
      ? "Limite de usuários sob proposta"
      : `Até ${plan.limits.sellerLimit.toLocaleString("pt-BR")} usuário${plan.limits.sellerLimit === 1 ? "" : "s"}`,
    plateLimit == null
      ? "Consultas de placa sob proposta"
      : `${plateLimit.toLocaleString("pt-BR")} consultas de placa/mês`,
  ];
}

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
