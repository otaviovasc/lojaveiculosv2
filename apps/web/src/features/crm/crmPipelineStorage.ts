export type PipelineStage = {
  id: string;
  name: string;
  color: string;
  slaDays: number | null;
  status: "open" | "won" | "lost";
  isSystem: boolean;
};

export type RoutingRule = {
  id: string;
  origin: string;
  storeId: string;
};

export type Pipeline = {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  stages: PipelineStage[];
  routingRules: RoutingRule[];
  rotationActive: boolean;
};

const DEFAULT_VENDAS_STAGES: PipelineStage[] = [
  {
    id: "new",
    name: "Novo Lead",
    color: "#" + "3b82f6",
    slaDays: 1,
    status: "open",
    isSystem: true,
  },
  {
    id: "contacted",
    name: "Contactado",
    color: "#" + "a855f7",
    slaDays: 2,
    status: "open",
    isSystem: true,
  },
  {
    id: "qualified",
    name: "Qualificado",
    color: "#" + "eab308",
    slaDays: 3,
    status: "open",
    isSystem: true,
  },
  {
    id: "negotiating",
    name: "Negociando",
    color: "#" + "f97316",
    slaDays: 5,
    status: "open",
    isSystem: true,
  },
  {
    id: "won",
    name: "Ganho",
    color: "#" + "22c55e",
    slaDays: null,
    status: "won",
    isSystem: true,
  },
  {
    id: "lost",
    name: "Perdido",
    color: "#" + "ef4444",
    slaDays: null,
    status: "lost",
    isSystem: true,
  },
];

const DEFAULT_CAPTACAO_STAGES: PipelineStage[] = [
  {
    id: "cap_solicitada",
    name: "Avaliação Solicitada",
    color: "#" + "3b82f6",
    slaDays: 1,
    status: "open",
    isSystem: false,
  },
  {
    id: "cap_vistoriado",
    name: "Veículo Vistoriado",
    color: "#" + "a855f7",
    slaDays: 2,
    status: "open",
    isSystem: false,
  },
  {
    id: "cap_proposta",
    name: "Proposta Apresentada",
    color: "#" + "eab308",
    slaDays: 2,
    status: "open",
    isSystem: false,
  },
  {
    id: "cap_ganho",
    name: "Contrato Assinado",
    color: "#" + "22c55e",
    slaDays: null,
    status: "won",
    isSystem: false,
  },
  {
    id: "cap_perdido",
    name: "Recusado",
    color: "#" + "ef4444",
    slaDays: null,
    status: "lost",
    isSystem: false,
  },
];

export const DEFAULT_PIPELINES: Pipeline[] = [
  {
    id: "vendas",
    name: "Vendas",
    description: "Pipeline padrão de vendas de veículos",
    isDefault: true,
    stages: DEFAULT_VENDAS_STAGES,
    routingRules: [
      { id: "rule-1", origin: "public_site", storeId: "all" },
      { id: "rule-2", origin: "whatsapp", storeId: "all" },
    ],
    rotationActive: true,
  },
  {
    id: "captacao",
    name: "Captação de Veículos",
    description: "Pipeline de avaliação e captação de novos veículos",
    isDefault: false,
    stages: DEFAULT_CAPTACAO_STAGES,
    routingRules: [{ id: "rule-3", origin: "manual", storeId: "all" }],
    rotationActive: false,
  },
];

export function getPipelines(storeId = "default"): Pipeline[] {
  if (typeof window === "undefined") return DEFAULT_PIPELINES;
  const key = `crm_pipelines_${storeId}`;
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(DEFAULT_PIPELINES));
    return DEFAULT_PIPELINES;
  }
  try {
    return JSON.parse(stored) as Pipeline[];
  } catch {
    return DEFAULT_PIPELINES;
  }
}

export function savePipelines(
  pipelines: Pipeline[],
  storeId = "default",
): void {
  if (typeof window === "undefined") return;
  const key = `crm_pipelines_${storeId}`;
  localStorage.setItem(key, JSON.stringify(pipelines));
}

export function getActivePipelineId(storeId = "default"): string {
  if (typeof window === "undefined") return "vendas";
  const key = `crm_active_pipeline_${storeId}`;
  const active = localStorage.getItem(key);
  if (active) return active;
  const pipelines = getPipelines(storeId);
  const def = pipelines.find((p) => p.isDefault) ?? pipelines[0];
  return def?.id ?? "vendas";
}

export function saveActivePipelineId(id: string, storeId = "default"): void {
  if (typeof window === "undefined") return;
  const key = `crm_active_pipeline_${storeId}`;
  localStorage.setItem(key, id);
}
