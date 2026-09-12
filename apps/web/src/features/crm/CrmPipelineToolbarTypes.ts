export type CustomFilters = {
  origem: string[];
  resposta: string[];
  responsavel?: string | undefined;
  semInteracao: string;
  veiculoId?: string | undefined;
};

export type FilterConfig = {
  key: "origem" | "resposta" | "semInteracao";
  label: string;
  options: { id: string; label: string }[];
};

export const FILTER_CONFIGS: FilterConfig[] = [
  {
    key: "origem",
    label: "Origem",
    options: [
      { id: "manual", label: "Manual" },
      { id: "whatsapp", label: "WhatsApp" },
      { id: "instagram", label: "Instagram" },
      { id: "olx", label: "OLX" },
      { id: "public_site", label: "Site" },
      { id: "crm", label: "CRM" },
      { id: "external_api", label: "API externa" },
      { id: "other", label: "Outro" },
    ],
  },
  {
    key: "resposta",
    label: "Resposta",
    options: [
      { id: "no-response", label: "Apenas não respondidos" },
      { id: "responded", label: "Respondidos" },
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
];
