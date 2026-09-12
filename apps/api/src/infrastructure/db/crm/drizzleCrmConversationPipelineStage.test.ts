import { describe, expect, it } from "vitest";
import type { CrmConversationCycle } from "../../../domains/crm/ports/crmConversationRepositoryModels.js";
import { attachLeadPipelineStages } from "./drizzleCrmConversationPipelineStage.js";

function cycle(leadId: string | null): CrmConversationCycle {
  return { id: `cycle-${leadId ?? "none"}`, leadId } as CrmConversationCycle;
}

describe("CRM conversation cycle pipeline-stage attach", () => {
  it("attaches the resolved stage only to cycles with a matching lead", () => {
    const stages = new Map([
      [
        "lead-1",
        {
          pipelineName: "Funil vendas",
          stageColor: "#22c55e",
          stageId: "stage-1",
          stageName: "Negociação",
        },
      ],
    ]);
    const [matched, unmatched, noLead] = attachLeadPipelineStages(
      [cycle("lead-1"), cycle("lead-2"), cycle(null)],
      stages,
    );
    expect(matched?.leadPipelineStage).toMatchObject({
      stageColor: "#22c55e",
      stageName: "Negociação",
    });
    expect(unmatched?.leadPipelineStage).toBeUndefined();
    expect(noLead?.leadPipelineStage).toBeUndefined();
  });

  it("returns the same cycle reference when no stage matches", () => {
    const original = cycle("lead-9");
    const [result] = attachLeadPipelineStages([original], new Map());
    expect(result).toBe(original);
  });
});
