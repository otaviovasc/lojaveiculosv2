import type { CrmPipelineStageInput } from "../../../domains/crm/ports/crmPipelineRepository.js";

export const defaultCrmPipelineStages: CrmPipelineStageInput[] = [
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
    status: "won",
  },
  {
    color: "#ef4444",
    isSystem: true,
    leadStatus: "lost",
    name: "Perdido",
    status: "lost",
  },
];
