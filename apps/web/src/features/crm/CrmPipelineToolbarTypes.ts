export type CustomFilters = {
  resposta: string[];
  origem: string[];
  responsavel: string[];
  semInteracao: string;
  fonte: string[];
};

export type FilterConfig = {
  key: keyof CustomFilters;
  label: string;
  options: { id: string; label: string }[];
};

export const FILTER_CONFIGS: FilterConfig[] = [
  {
    key: "resposta",
    label: "Resposta",
    options: [
      { id: "no-response", label: "Apenas não respondidos" },
      { id: "responded", label: "Respondidos" },
    ],
  },
  {
    key: "origem",
    label: "Origem",
    options: [
      { id: "manual", label: "Manual" },
      { id: "public_site", label: "Site público" },
      { id: "crm", label: "CRM" },
      { id: "external_api", label: "API externa" },
      { id: "olx", label: "OLX" },
      { id: "whatsapp", label: "WhatsApp" },
      { id: "other", label: "Outro" },
    ],
  },
  {
    key: "responsavel",
    label: "Responsável",
    options: [
      { id: "unassigned", label: "Sem responsável" },
      { id: "assigned", label: "Com responsável" },
    ],
  },
  {
    key: "semInteracao",
    label: "Sem interação",
    options: [
      { id: "1", label: "Mais de 1 dia" },
      { id: "3", label: "Mais de 3 dias" },
      { id: "7", label: "Mais de 7 dias" },
      { id: "15", label: "Mais de 15 dias" },
      { id: "30", label: "Mais de 30 dias" },
    ],
  },
  {
    key: "fonte",
    label: "Fonte",
    options: [
      { id: "public_site", label: "Site público" },
      { id: "external_api", label: "API externa" },
      { id: "whatsapp", label: "WhatsApp" },
    ],
  },
];
