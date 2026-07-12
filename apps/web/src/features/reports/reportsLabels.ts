const funnelLabels: Record<string, string> = {
  contacted: "Contato iniciado",
  lost: "Perdidos",
  negotiating: "Em negociação",
  new: "Novos",
  qualified: "Qualificados",
  won: "Ganhos",
};

const sourceLabels: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  manual: "Cadastro manual",
  mercado_livre: "Mercado Livre",
  olx: "OLX",
  public_site: "Site da loja",
  referral: "Indicação",
  whatsapp: "WhatsApp",
};

const kpiLabels: Record<string, string> = {
  Disponiveis: "Disponíveis",
  "GMV fechado": "Vendas fechadas",
  Leads: "Leads",
  Recebiveis: "Recebíveis",
  "Recebiveis abertos": "Recebíveis em aberto",
};

const deltaLabels: Record<string, string> = {
  "em aberto": "em aberto",
  "estoque total": "do estoque total",
  "funil ativo": "no funil ativo",
  "periodo atual": "período atual",
  "período atual": "período atual",
};

export function getReportFunnelLabel(key: string) {
  return funnelLabels[key] ?? "Outra etapa";
}

export function getReportSourceLabel(key: string) {
  return sourceLabels[key] ?? "Outra origem";
}

export function getReportKpiLabel(label: string) {
  return kpiLabels[label] ?? "Indicador comercial";
}

export function getReportDeltaLabel(label: string) {
  return deltaLabels[label] ?? "período informado";
}
