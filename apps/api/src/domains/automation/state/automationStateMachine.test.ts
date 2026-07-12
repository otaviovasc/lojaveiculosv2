import { describe, expect, it } from "vitest";
import { buildAutomationPreviewProposal } from "../previewProposal.js";
import {
  assertApprovalDecisionTransition,
  assertRunDecisionTransition,
  assertStepDecisionTransition,
} from "./automationStateMachine.js";

describe("automation preview state machine", () => {
  it("allows only pending preview decisions", () => {
    expect(() =>
      assertRunDecisionTransition("awaiting_approval", "approved"),
    ).not.toThrow();
    expect(() =>
      assertStepDecisionTransition("awaiting_approval", "rejected"),
    ).not.toThrow();
    expect(() =>
      assertApprovalDecisionTransition("pending", "cancelled"),
    ).not.toThrow();
    expect(() => assertRunDecisionTransition("approved", "cancelled")).toThrow(
      "Automation cannot transition from approved.",
    );
    expect(() =>
      assertApprovalDecisionTransition("rejected", "approved"),
    ).toThrow("Automation cannot transition from rejected.");
  });

  it("generates a deterministic digest for the exact read-only proposal", async () => {
    const input = {
      context: { module: "inventory", resourceId: "vehicle_1" },
      objective: "Review vehicle readiness",
    };
    const first = await buildAutomationPreviewProposal(input);
    const second = await buildAutomationPreviewProposal(input);
    const changed = await buildAutomationPreviewProposal({
      ...input,
      objective: "Review vehicle pricing",
    });

    expect(first.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(second.digest).toBe(first.digest);
    expect(changed.digest).not.toBe(first.digest);
    expect(first.summary).toContain("Nenhuma ferramenta");
  });
});
