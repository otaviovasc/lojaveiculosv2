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

const ageBucketLabels: Record<string, string> = {
  days0to30: "0–30 dias",
  days31to60: "31–60 dias",
  days61to90: "61–90 dias",
  over90: "Mais de 90 dias",
};

export function getReportFunnelLabel(key: string) {
  return funnelLabels[key] ?? "Outra etapa";
}

export function getReportSourceLabel(key: string) {
  return sourceLabels[key] ?? "Outra origem";
}

export function getReportAgeBucketLabel(key: string) {
  return ageBucketLabels[key] ?? "Idade desconhecida";
}
