import { describe, expect, it } from "vitest";
import { createServiceContext } from "../../../../../shared/serviceContext.js";
import {
  createExternalBotActionRequest,
  createExternalBotActionContext,
  withExternalBotActionDigest,
} from "../../testSupportExternalBotAction.js";
import { createMemoryExternalBotManager } from "../../testSupportExternalBotManager.js";
import { decideExternalBotProposal } from "./decideExternalBotProposal.js";
import { executeExternalBotAction } from "./executeExternalBotAction.js";

describe("decideExternalBotProposal", () => {
  it("approves once and hands the command to the durable effect flow", async () => {
    let effects = 0;
    const manager = createMemoryExternalBotManager({
      effectDispatcher: {
        dispatch: async () => {
          effects += 1;
          return { kind: "queued" };
        },
      },
      inspect: async () => ({
        attendanceRevision: 2,
        humanAttendanceActive: false,
        revision: 4,
        scopeExists: true,
      }),
      policyMode: "proposal",
    });
    const request = await createExternalBotActionRequest(
      manager,
      "message.send_text",
      { text: "Approved reply" },
    );
    await executeExternalBotAction(
      createExternalBotActionContext(),
      withExternalBotActionDigest(manager, request),
      manager.ports,
    );
    const proposal = manager.proposals[0]!;
    const first = await decideExternalBotProposal(
      decisionContext(),
      {
        decision: "approved",
        expectedRevision: 0,
        proposalId: proposal.id,
      },
      manager.ports,
    );
    const replay = await decideExternalBotProposal(
      decisionContext(),
      {
        decision: "approved",
        expectedRevision: 0,
        proposalId: proposal.id,
      },
      manager.ports,
    );
    expect(first.action.status).toBe("executing");
    expect(replay.kind).toBe("existing");
    expect(effects).toBe(1);
  });

  it("rejects within scope and never creates a provider effect", async () => {
    let effects = 0;
    const manager = createMemoryExternalBotManager({
      effectDispatcher: {
        dispatch: async () => {
          effects += 1;
          return { kind: "queued" };
        },
      },
      inspect: async () => ({
        attendanceRevision: 2,
        humanAttendanceActive: false,
        revision: 4,
        scopeExists: true,
      }),
      policyMode: "proposal",
    });
    const request = await createExternalBotActionRequest(
      manager,
      "message.send_text",
      { text: "Do not send" },
    );
    await executeExternalBotAction(
      createExternalBotActionContext(),
      withExternalBotActionDigest(manager, request),
      manager.ports,
    );
    const result = await decideExternalBotProposal(
      decisionContext(),
      {
        decision: "rejected",
        expectedRevision: 0,
        proposalId: manager.proposals[0]!.id,
      },
      manager.ports,
    );
    expect(result.action.status).toBe("cancelled");
    expect(effects).toBe(0);
  });

  it("hides proposals from another store", async () => {
    const manager = createMemoryExternalBotManager({ policyMode: "proposal" });
    await expect(
      decideExternalBotProposal(
        { ...decisionContext(), storeId: "other-store" },
        {
          decision: "approved",
          expectedRevision: 0,
          proposalId: "proposal-1",
        },
        manager.ports,
      ),
    ).rejects.toMatchObject({ code: "CRM_BOT_PROPOSAL_NOT_FOUND" });
  });
});

function decisionContext() {
  return createServiceContext({
    actor: { id: "00000000-0000-4000-8000-000000000099", kind: "user" },
    permissions: ["crm.bot.proposals.decide"],
    request: { requestId: "proposal-decision-1" },
    storeId: "store-1",
    tenantId: "tenant-1",
  });
}
