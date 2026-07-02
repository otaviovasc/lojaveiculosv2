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
      { id: "no-response", label: "Apenas nao respondidos" },
      { id: "responded", label: "Respondidos" },
    ],
  },
  {
    key: "origem",
    label: "Origem",
    options: [
      { id: "Manual", label: "Manual" },
      { id: "OLX", label: "OLX" },
      { id: "ICarros", label: "ICarros" },
      { id: "Webmotors", label: "Webmotors" },
      { id: "NaPista", label: "NaPista" },
      { id: "UsadosBR", label: "UsadosBR" },
      { id: "Mobiauto", label: "Mobiauto" },
    ],
  },
  {
    key: "responsavel",
    label: "Responsavel",
    options: [
      { id: "unassigned", label: "Sem responsavel" },
      { id: "kauan-massuia", label: "Kauan Massuia" },
    ],
  },
  {
    key: "semInteracao",
    label: "Sem interacao",
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
    options: [{ id: "Instagram", label: "Instagram" }],
  },
];
