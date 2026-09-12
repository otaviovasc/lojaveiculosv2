import * as schema from "@lojaveiculosv2/db";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { loadLocalEnv } from "../../config/loadLocalEnv.js";
import { createDrizzleCrmConversationRepository } from "./drizzleCrmConversationRepository.js";
import {
  assertRawCrmConversationDuplicateAndCas,
  seedRawCrmConversationFixture,
  seedRawCrmMessage,
  withRawCrmTransaction,
} from "./drizzleCrmConversationConsistency.rawDbTestSupport.js";

loadLocalEnv();
const runRawDb = process.env.RUN_RAW_CRM_DB_TESTS === "true";

describe.skipIf(!runRawDb)("CRM conversation Postgres consistency", () => {
  it("infers the partial provider-message conflict target and reconciles an outbound echo", async () => {
    await withRawCrmTransaction(async (transaction) => {
      const fixture = await seedRawCrmConversationFixture(transaction);
      const repository = createDrizzleCrmConversationRepository(transaction, {
        disableTransactions: true,
      });
      await assertRawCrmConversationDuplicateAndCas(
        repository,
        fixture.primary,
      );
    });
  });

  it("covers canonical list/count/messages, filters, isolation, and CAS", async () => {
    await withRawCrmTransaction(async (transaction) => {
      const fixture = await seedRawCrmConversationFixture(transaction);
      const repository = createDrizzleCrmConversationRepository(transaction, {
        disableTransactions: true,
      });
      const scope = fixture.primary;
      const alice = await seedRawCrmMessage(repository, scope, {
        customerDisplayName: "Alice Financing",
        customerPhone: "5511999000001",
        content: "Need financing options",
        providerTimestamp: new Date("2026-08-18T12:01:00.000Z"),
      });
      await seedRawCrmMessage(repository, scope, {
        customerPhone: "5511999000001",
        content: "Human reply",
        direction: "OUTBOUND",
        senderOrigin: "human_crm",
        senderType: "HUMAN",
        status: "SENT",
        providerTimestamp: new Date("2026-08-18T12:02:00.000Z"),
      });
      const bruno = await seedRawCrmMessage(repository, scope, {
        customerDisplayName: "Bruno Buyer",
        customerPhone: "5511999000002",
        direction: "OUTBOUND",
        senderOrigin: "human_crm",
        senderType: "HUMAN",
        status: "SENT",
        providerTimestamp: new Date("2026-08-18T12:03:00.000Z"),
      });
      const carla = await seedRawCrmMessage(repository, scope, {
        customerDisplayName: "Carla Buyer",
        customerPhone: "5511999000003",
        content: "Completed trade",
        providerTimestamp: new Date("2026-08-18T12:04:00.000Z"),
      });
      const assigned = await repository.updateConversationCycle({
        assignedUserId: fixture.assigneeId,
        expectedRevision: bruno.conversationCycle.revision,
        cycleId: bruno.conversationCycle.id,
        storeId: scope.storeId,
        tenantId: scope.tenantId,
      });
      expect(assigned?.assignedUserId).toBe(fixture.assigneeId);
      const completed = await repository.updateConversationCycle({
        assignedUserId: fixture.otherAssigneeId,
        expectedRevision: carla.conversationCycle.revision,
        lastReadAt: new Date(Date.now() + 1_000),
        cycleId: carla.conversationCycle.id,
        status: "COMPLETED",
        storeId: scope.storeId,
        tenantId: scope.tenantId,
      });
      expect(completed?.status).toBe("COMPLETED");
      if (!completed) {
        throw new Error("Synthetic conversation cycle was not completed.");
      }
      const sibling = await seedRawCrmMessage(repository, fixture.sibling, {
        customerPhone: "5511999000004",
        content: "Sibling store message",
      });
      const foreign = await seedRawCrmMessage(repository, fixture.foreign, {
        customerPhone: "5511999000005",
        content: "Foreign tenant message",
      });
      const query = {
        limit: 10,
        offset: 0,
        queueVisibility: { kind: "global" as const },
        storeId: scope.storeId,
        tenantId: scope.tenantId,
      };
      const listed = await repository.listConversationCycles(query);
      expect(listed).toHaveLength(3);
      expect(listed.map(({ id }) => id)).toEqual(
        expect.arrayContaining([
          alice.conversationCycle.id,
          bruno.conversationCycle.id,
          carla.conversationCycle.id,
        ]),
      );
      expect(await repository.countConversationCycles(query)).toBe(3);
      expect(
        await repository.countConversationCycles({
          ...query,
          unreadOnly: true,
        }),
      ).toBe(1);
      expect(
        (
          await repository.listConversationCycles({
            ...query,
            search: "financing",
          })
        ).map(({ id }) => id),
      ).toEqual([alice.conversationCycle.id]);
      expect(
        await repository.countConversationCycles({
          ...query,
          status: "ACTIVE",
        }),
      ).toBe(2);
      expect(
        await repository.countConversationCycles({
          ...query,
          status: "COMPLETED",
        }),
      ).toBe(1);
      expect(
        (
          await repository.listConversationCycles({
            ...query,
            assignedUserId: fixture.assigneeId,
            filter: "mine",
          })
        ).map(({ id }) => id),
      ).toEqual([bruno.conversationCycle.id]);
      expect(await repository.countConversationCyclesByAssignee(query)).toEqual(
        expect.arrayContaining([
          { assigneeId: fixture.assigneeId, count: 1 },
          { assigneeId: fixture.otherAssigneeId, count: 1 },
        ]),
      );
      expect(
        await repository.listMessages({
          limit: 10,
          offset: 0,
          cycleId: alice.conversationCycle.id,
          storeId: scope.storeId,
          tenantId: scope.tenantId,
        }),
      ).toHaveLength(2);
      expect(
        await repository.listMessages({
          direction: "INBOUND",
          limit: 10,
          offset: 0,
          cycleId: alice.conversationCycle.id,
          storeId: scope.storeId,
          tenantId: scope.tenantId,
        }),
      ).toHaveLength(1);
      expect(
        await repository.findMessageByExternalId({
          connectionId: scope.connectionId,
          externalId: alice.message.externalId ?? "",
          storeId: fixture.sibling.storeId,
          tenantId: fixture.sibling.tenantId,
        }),
      ).toBeNull();
      expect(
        (
          await repository.listConversationCycles({
            ...query,
            storeId: fixture.sibling.storeId,
            tenantId: fixture.sibling.tenantId,
          })
        ).map(({ id }) => id),
      ).toEqual([sibling.conversationCycle.id]);
      expect(
        (
          await repository.listConversationCycles({
            ...query,
            storeId: fixture.foreign.storeId,
            tenantId: fixture.foreign.tenantId,
          })
        ).map(({ id }) => id),
      ).toEqual([foreign.conversationCycle.id]);
      expect(
        await repository.listConversationCycles({
          ...query,
          tenantId: fixture.foreign.tenantId,
        }),
      ).toEqual([]);
      expect(
        await repository.updateConversationCycle({
          expectedRevision: completed.revision,
          cycleId: carla.conversationCycle.id,
          status: "ACTIVE",
          storeId: fixture.sibling.storeId,
          tenantId: fixture.sibling.tenantId,
        }),
      ).toBeNull();
      expect(
        await repository.updateConversationCycle({
          expectedRevision: carla.conversationCycle.revision,
          cycleId: carla.conversationCycle.id,
          status: "ACTIVE",
          storeId: scope.storeId,
          tenantId: scope.tenantId,
        }),
      ).toBeNull();
      const [canonicalCycle] = await transaction
        .select({
          revision: schema.conversationCycles.revision,
          state: schema.conversationCycles.state,
        })
        .from(schema.conversationCycles)
        .where(eq(schema.conversationCycles.id, carla.conversationCycle.id));
      expect(canonicalCycle).toEqual({
        revision: completed.revision,
        state: "completed",
      });
    });
  });
});
