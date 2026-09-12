import { describe, expect, it } from "vitest";
import { applyConversationCycleAssignment } from "../../../domains/crm/messaging/conversationCycleAssignment.js";
import { transitionHumanAttendance } from "../../../domains/crm/messaging/humanAttendanceTransition.js";
import type { CrmServicePorts } from "../../../domains/crm/services/CrmService/serviceSupport.js";
import { loadLocalEnv } from "../../config/loadLocalEnv.js";
import { createDrizzleCrmConversationRepository } from "./drizzleCrmConversationRepository.js";
import {
  seedRawCrmConversationFixture,
  seedRawCrmMessage,
  withRawCrmTransaction,
} from "./drizzleCrmConversationConsistency.rawDbTestSupport.js";

loadLocalEnv();
const runRawDb = process.env.RUN_RAW_CRM_DB_TESTS === "true";

describe.skipIf(!runRawDb)("CRM conversation assignment consistency", () => {
  it("returns an unassigned active attendance to the waiting-human state", async () => {
    await withRawCrmTransaction(async (transaction) => {
      const fixture = await seedRawCrmConversationFixture(transaction);
      const repository = createDrizzleCrmConversationRepository(transaction, {
        disableTransactions: true,
      });
      const inbound = await seedRawCrmMessage(repository, fixture.primary);
      const assigned = await repository.updateConversationCycle({
        assignedUserId: fixture.assigneeId,
        expectedRevision: inbound.conversationCycle.revision,
        cycleId: inbound.conversationCycle.id,
        storeId: fixture.primary.storeId,
        tenantId: fixture.primary.tenantId,
      });
      expect(assigned).not.toBeNull();
      if (!assigned) throw new Error("Raw CRM assignment was not persisted.");
      const active = await transitionHumanAttendance({
        actorId: fixture.assigneeId,
        actorKind: "user",
        command: {
          kind: "start",
          reason: "raw_unassignment_regression",
          source: "raw_db_test",
          state: "IN_HUMAN_SERVICE",
        },
        repository,
        conversationCycle: assigned,
      });

      const result = await applyConversationCycleAssignment({
        actorId: fixture.assigneeId,
        actorKind: "user",
        allowReassignment: true,
        assignedAt: new Date("2026-08-31T18:38:02.679Z"),
        assignedUserId: null,
        initialSession: active.conversationCycle,
        ports: {
          crmConversationRepository: repository,
        } as CrmServicePorts,
        scope: {
          storeId: fixture.primary.storeId,
          tenantId: fixture.primary.tenantId,
        },
      });

      expect(result).toMatchObject({
        result: "applied",
        conversationCycle: {
          assignedUserId: null,
          humanAttendanceState: "WAITING_HUMAN",
          humanHandlingStartedAt: null,
          status: "HUMAN_TAKEOVER",
        },
      });
    });
  });
});
