import type { PipelineStageDraft } from "./crmPipelineStorage";

export type PipelinePreset = {
  description: string;
  iconName: "vendas" | "pos_venda" | "recuperacao" | "em_branco";
  id: string;
  name: string;
  stages: PipelineStageDraft[];
};

export const crmPipelinePresets: readonly PipelinePreset[] = [
  {
    id: "vendas",
    name: "Vendas",
    description: "Funil de vendas clássico para novos leads e negociações.",
    iconName: "vendas",
    stages: [
      { name: "Novo lead", color: "#" + "3b82f6", slaDays: 1, status: "open" },
      {
        name: "Primeiro contato",
        color: "#" + "a855f7",
        slaDays: 2,
        status: "open",
      },
      {
        name: "Qualificado",
        color: "#" + "6366f1",
        slaDays: 3,
        status: "open",
      },
      { name: "Proposta", color: "#" + "f97316", slaDays: 4, status: "open" },
      { name: "Negociação", color: "#" + "eab308", slaDays: 5, status: "open" },
      { name: "Ganho", color: "#" + "22c55e", slaDays: null, status: "won" },
      { name: "Perdido", color: "#" + "ef4444", slaDays: null, status: "lost" },
    ],
  },
  {
    id: "pos_venda",
    name: "Pós-venda",
    description: "Entrega de veículo, documentação e fidelização.",
    iconName: "pos_venda",
    stages: [
      {
        name: "Entrega agendada",
        color: "#" + "3b82f6",
        slaDays: 1,
        status: "open",
      },
      {
        name: "Documentação",
        color: "#" + "a855f7",
        slaDays: 5,
        status: "open",
      },
      {
        name: "Revisão de entrega",
        color: "#" + "eab308",
        slaDays: 2,
        status: "open",
      },
      { name: "Pesquisa", color: "#" + "f97316", slaDays: 3, status: "open" },
      {
        name: "Finalizado",
        color: "#" + "22c55e",
        slaDays: null,
        status: "won",
      },
    ],
  },
  {
    id: "recuperacao",
    name: "Recuperação",
    description: "Reengajamento de leads frios e clientes perdidos.",
    iconName: "recuperacao",
    stages: [
      {
        name: "Lead inativo",
        color: "#" + "ef4444",
        slaDays: 7,
        status: "open",
      },
      {
        name: "Tentativa de contato",
        color: "#" + "a855f7",
        slaDays: 2,
        status: "open",
      },
      {
        name: "Oferta especial",
        color: "#" + "eab308",
        slaDays: 3,
        status: "open",
      },
      {
        name: "Reativado",
        color: "#" + "22c55e",
        slaDays: null,
        status: "won",
      },
      {
        name: "Definitivo",
        color: "#" + "ef4444",
        slaDays: null,
        status: "lost",
      },
    ],
  },
  {
    id: "em_branco",
    name: "Em branco",
    description: "Comece com etapas mínimas e monte como preferir.",
    iconName: "em_branco",
    stages: [
      { name: "Novo", color: "#" + "3b82f6", slaDays: 1, status: "open" },
      { name: "Ganho", color: "#" + "22c55e", slaDays: null, status: "won" },
      { name: "Perdido", color: "#" + "ef4444", slaDays: null, status: "lost" },
    ],
  },
];
