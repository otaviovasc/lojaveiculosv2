import { createMemoryAuditSink } from "@lojaveiculosv2/audit";
import { describe, expect, it } from "vitest";
import { approveAutomationStep } from "../../../../domains/automation/services/AutomationService/approveAutomationStep.js";
import { cancelAutomationRun } from "../../../../domains/automation/services/AutomationService/cancelAutomationRun.js";
import { createAutomationPreviewRun } from "../../../../domains/automation/services/AutomationService/createAutomationPreviewRun.js";
import { listAutomationRuns } from "../../../../domains/automation/services/AutomationService/listAutomationRuns.js";
import { createServiceContext } from "../../../../shared/serviceContext.js";
import { createMemoryAutomationRunRepository } from "./automationRunRepository.js";

const permissions = [
  "automation.approve",
  "automation.cancel",
  "automation.read",
  "automation.run",
];

describe("AutomationService contracts", () => {
  it("enforces input bounds and normalization outside HTTP controllers", async () => {
    const ports = createPorts();
    const context = createContext();

    await expect(
      createAutomationPreviewRun(context, { objective: " x " }, ports),
    ).rejects.toThrow("between 3 and 2000 characters");
    await expect(
      createAutomationPreviewRun(
        context,
        {
          context: { module: "m".repeat(121) },
          objective: "Review inventory",
        },
        ports,
      ),
    ).rejects.toThrow("Context module");
    await expect(
      listAutomationRuns(context, { limit: 101, offset: 0 }, ports),
    ).rejects.toThrow("pagination is invalid");

    const run = await createAutomationPreviewRun(
      context,
      {
        context: { module: " inventory ", resourceId: " vehicle_1 " },
        objective: " Review inventory ",
      },
      ports,
    );
    expect(run.objective).toBe("Review inventory");
    expect(run.context).toEqual({
      module: "inventory",
      resourceId: "vehicle_1",
    });
  });

  it("denies a scoped context that does not carry entitlements", async () => {
    await expect(
      createAutomationPreviewRun(
        createContext(false),
        { objective: "Review inventory" },
        createPorts(),
      ),
    ).rejects.toThrow("Missing entitlement: automation");
  });

  it("persists decision actors and marks decision audits as critical", async () => {
    const audit = createMemoryAuditSink();
    const ports = createPorts();
    const context = createContext(true, audit);
    const run = await createAutomationPreviewRun(
      context,
      { objective: "Review inventory" },
      ports,
    );
    const step = run.steps[0]!;
    const approval = step.approval!;
    await approveAutomationStep(
      context,
      {
        expectedApprovalVersion: approval.version,
        expectedProposalDigest: approval.proposalDigest,
        expectedRunVersion: run.version,
        expectedStepVersion: step.version,
        runId: run.id,
        stepId: step.id,
      },
      ports,
    );

    expect(audit.events.at(-1)).toEqual(
      expect.objectContaining({
        action: "automation.step.approve",
        criticality: "critical",
      }),
    );

    const pending = await createAutomationPreviewRun(
      context,
      { objective: "Cancel preview" },
      ports,
    );
    const cancelled = await cancelAutomationRun(
      context,
      { expectedRunVersion: pending.version, runId: pending.id },
      ports,
    );
    expect(cancelled.steps[0]?.approval?.decidedByActorId).toBe("user_1");
    expect(audit.events.at(-1)).toEqual(
      expect.objectContaining({
        action: "automation.run.cancel",
        criticality: "critical",
      }),
    );
  });
});

function createPorts() {
  return { automationRunRepository: createMemoryAutomationRunRepository() };
}

function createContext(
  includeEntitlement = true,
  audit = createMemoryAuditSink(),
) {
  const context = createServiceContext({
    actor: { id: "user_1", kind: "user" },
    audit,
    permissions,
    request: { requestId: "req_automation_service" },
    storeId: "store_1",
    tenantId: "tenant_1",
  });
  return includeEntitlement
    ? Object.assign(context, { entitlements: ["automation"] as const })
    : context;
}
