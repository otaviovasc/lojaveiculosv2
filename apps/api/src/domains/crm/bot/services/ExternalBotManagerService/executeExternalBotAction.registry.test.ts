import { externalBotActionRegistry } from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import { createServiceContext } from "../../../../../shared/serviceContext.js";
import { createMemoryExternalBotManager } from "../../testSupportExternalBotManager.js";
import {
  createExternalBotActionContext as context,
  createExternalBotActionRequest as request,
  withExternalBotActionDigest as withDigest,
} from "../../testSupportExternalBotAction.js";
import { decideExternalBotProposal } from "./decideExternalBotProposal.js";
import { executeExternalBotAction } from "./executeExternalBotAction.js";

describe("executeExternalBotAction registry", () => {
  it("executes every registered action through the operational effect dispatcher", async () => {
    let effects = 0;
    const manager = createMemoryExternalBotManager({
      effectDispatcher: {
        dispatch: async () => {
          effects += 1;
          return { kind: "succeeded" };
        },
      },
      inspect: async () => ({
        humanAttendanceActive: false,
        revision: 4,
        scopeExists: true,
      }),
    });
    for (const action of externalBotActionRegistry) {
      const command = await request(manager, action, payloadFor(action));
      const result = await executeExternalBotAction(
        context(),
        withDigest(manager, command),
        manager.ports,
      );
      expect(result.status).toBe("completed");
    }
    expect(effects).toBe(externalBotActionRegistry.length);
  });

  it("executes every registered action only after proposal approval", async () => {
    for (const action of externalBotActionRegistry) {
      let effects = 0;
      const manager = createMemoryExternalBotManager({
        effectDispatcher: {
          dispatch: async () => {
            effects += 1;
            return { kind: "succeeded" };
          },
        },
        inspect: async () => ({
          humanAttendanceActive: false,
          revision: 4,
          scopeExists: true,
        }),
        policyMode: "proposal",
      });
      const command = await request(manager, action, payloadFor(action));
      const pending = await executeExternalBotAction(
        context(),
        withDigest(manager, command),
        manager.ports,
      );
      expect(pending.status).toBe("pending_approval");
      expect(effects).toBe(0);
      const approved = await decideExternalBotProposal(
        proposalDecisionContext(),
        {
          decision: "approved",
          expectedRevision: 0,
          proposalId: manager.proposals[0]!.id,
        },
        manager.ports,
      );
      expect(approved.action.status).toBe("completed");
      expect(effects).toBe(1);
    }
  });
});

function proposalDecisionContext() {
  return createServiceContext({
    actor: { id: "00000000-0000-4000-8000-000000000099", kind: "user" },
    permissions: ["crm.bot.proposals.decide"],
    request: { requestId: "proposal-decision" },
    storeId: "store-1",
    tenantId: "tenant-1",
  });
}

function payloadFor(action: (typeof externalBotActionRegistry)[number]) {
  switch (action) {
    case "message.send_text":
      return { text: "Hello" };
    case "message.send_media":
      return {
        mediaType: "image",
        mediaUrl: "https://cdn.example.com/car.jpg",
      };
    case "message.send_template":
      return {
        language: "pt_BR",
        templateName: "vehicle_follow_up",
        variables: { customer: "Alex" },
      };
    case "conversation.summarize":
      return { summary: "Customer asked about a vehicle." };
    case "fact.record":
      return { classification: "purchase_intent", summary: "High intent." };
    case "vehicle_interest.record":
      return {
        interestLevel: "high",
        vehicleRef: "00000000-0000-4000-8000-000000000123",
      };
    case "handoff.request":
      return { reason: "Customer requested a person." };
    case "opportunity.open":
      return { summary: "Confirmed commercial intent." };
    case "task.create":
      return { title: "Call customer" };
    case "appointment.create":
      return {
        startsAt: "2026-08-19T12:00:00.000Z",
        summary: "Showroom visit",
      };
  }
}
