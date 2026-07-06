import type {
  CrmPipelineStageInput,
  CrmPipelineStageStatus,
} from "../ports/crmPipelineRepository.js";
import type { LeadStatus } from "../ports/crmRepository.js";

export type CrmPipelineStageDraft = {
  color: string;
  id?: string;
  isSystem?: boolean;
  leadStatus?: LeadStatus;
  name: string;
  slaDays?: number | null;
  sortOrder?: number;
  status: CrmPipelineStageStatus;
};

const openLeadStatus: LeadStatus = "negotiating";

export function normalizePipelineStages(
  stages: readonly CrmPipelineStageDraft[] | undefined,
): CrmPipelineStageInput[] {
  const source = stages?.length ? stages : defaultPipelineStages();
  return source.map((stage, index) => ({
    color: stage.color,
    ...(stage.id ? { id: stage.id } : {}),
    isSystem: stage.isSystem ?? false,
    leadStatus: stage.leadStatus ?? mapStageStatus(stage.status),
    name: stage.name,
    slaDays: stage.slaDays ?? null,
    sortOrder: stage.sortOrder ?? index,
    status: stage.status,
  }));
}

function defaultPipelineStages(): CrmPipelineStageDraft[] {
  return [
    {
      color: "#3b82f6",
      isSystem: true,
      leadStatus: "new",
      name: "Novo Lead",
      slaDays: 1,
      status: "open",
    },
    {
      color: "#22c55e",
      isSystem: true,
      leadStatus: "won",
      name: "Ganho",
      slaDays: null,
      status: "won",
    },
    {
      color: "#ef4444",
      isSystem: true,
      leadStatus: "lost",
      name: "Perdido",
      slaDays: null,
      status: "lost",
    },
  ];
}

function mapStageStatus(status: CrmPipelineStageStatus): LeadStatus {
  if (status === "won") return "won";
  if (status === "lost") return "lost";
  return openLeadStatus;
}
