import * as schema from "@lojaveiculosv2/db";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { loadLocalEnv } from "../../config/loadLocalEnv.js";
import { createDrizzleCrmWhatsappRepository } from "./drizzleCrmWhatsappRepository.js";
import {
  assertRawWhatsappDuplicateAndCas,
  seedRawWhatsappFixture,
  seedRawWhatsappMessage,
  withRawCrmTransaction,
} from "./drizzleCrmWhatsappConsistency.rawDbTestSupport.js";

loadLocalEnv();
const runRawDb = process.env.RUN_RAW_CRM_DB_TESTS === "true";

describe.skipIf(!runRawDb)("CRM WhatsApp Postgres consistency", () => {
  it("infers the partial provider-message conflict target and reconciles an outbound echo", async () => {
    await withRawCrmTransaction(async (transaction) => {
      const fixture = await seedRawWhatsappFixture(transaction);
      const repository = createDrizzleCrmWhatsappRepository(transaction, {
        disableTransactions: true,
      });
      await assertRawWhatsappDuplicateAndCas(repository, fixture.primary);
    });
  });

  it("covers canonical list/count/messages, filters, isolation, and CAS", async () => {
    await withRawCrmTransaction(async (transaction) => {
      const fixture = await seedRawWhatsappFixture(transaction);
      const repository = createDrizzleCrmWhatsappRepository(transaction, {
        disableTransactions: true,
      });
      const scope = fixture.primary;
      const alice = await seedRawWhatsappMessage(repository, scope, {
        buyerName: "Alice Financing",
        buyerPhone: "5511999000001",
        content: "Need financing options",
        providerTimestamp: new Date("2026-08-18T12:01:00.000Z"),
      });
      await seedRawWhatsappMessage(repository, scope, {
        buyerPhone: "5511999000001",
        content: "Human reply",
        direction: "OUTBOUND",
        senderOrigin: "human_crm",
        senderType: "HUMAN",
        status: "SENT",
        providerTimestamp: new Date("2026-08-18T12:02:00.000Z"),
      });
      const bruno = await seedRawWhatsappMessage(repository, scope, {
        buyerName: "Bruno Buyer",
        buyerPhone: "5511999000002",
        direction: "OUTBOUND",
        senderOrigin: "human_crm",
        senderType: "HUMAN",
        status: "SENT",
        providerTimestamp: new Date("2026-08-18T12:03:00.000Z"),
      });
      const carla = await seedRawWhatsappMessage(repository, scope, {
        buyerName: "Carla Buyer",
        buyerPhone: "5511999000003",
        content: "Completed trade",
        providerTimestamp: new Date("2026-08-18T12:04:00.000Z"),
      });
      const assigned = await repository.updateSession({
        assignedUserId: fixture.assigneeId,
        expectedRevision: bruno.session.revision,
        sessionId: bruno.session.id,
        storeId: scope.storeId,
        tenantId: scope.tenantId,
      });
      expect(assigned?.assignedUserId).toBe(fixture.assigneeId);
      const completed = await repository.updateSession({
        assignedUserId: fixture.otherAssigneeId,
        expectedRevision: carla.session.revision,
        lastReadAt: new Date(Date.now() + 1_000),
        sessionId: carla.session.id,
        status: "COMPLETED",
        storeId: scope.storeId,
        tenantId: scope.tenantId,
      });
      expect(completed?.status).toBe("COMPLETED");
      if (!completed) throw new Error("Synthetic session was not completed.");
      const sibling = await seedRawWhatsappMessage(
        repository,
        fixture.sibling,
        {
          buyerPhone: "5511999000004",
          content: "Sibling store message",
        },
      );
      const foreign = await seedRawWhatsappMessage(
        repository,
        fixture.foreign,
        {
          buyerPhone: "5511999000005",
          content: "Foreign tenant message",
        },
      );
      const query = {
        limit: 10,
        offset: 0,
        queueVisibility: { kind: "global" as const },
        storeId: scope.storeId,
        tenantId: scope.tenantId,
      };
      const listed = await repository.listSessions(query);
      expect(listed).toHaveLength(3);
      expect(listed.map(({ id }) => id)).toEqual(
        expect.arrayContaining([
          alice.session.id,
          bruno.session.id,
          carla.session.id,
        ]),
      );
      expect(await repository.countSessions(query)).toBe(3);
      expect(
        await repository.countSessions({ ...query, unreadOnly: true }),
      ).toBe(1);
      expect(
        (await repository.listSessions({ ...query, search: "financing" })).map(
          ({ id }) => id,
        ),
      ).toEqual([alice.session.id]);
      expect(
        await repository.countSessions({ ...query, status: "ACTIVE" }),
      ).toBe(2);
      expect(
        await repository.countSessions({ ...query, status: "COMPLETED" }),
      ).toBe(1);
      expect(
        (
          await repository.listSessions({
            ...query,
            assignedUserId: fixture.assigneeId,
            filter: "mine",
          })
        ).map(({ id }) => id),
      ).toEqual([bruno.session.id]);
      expect(await repository.countSessionsByAssignee(query)).toEqual(
        expect.arrayContaining([
          { assigneeId: fixture.assigneeId, count: 1 },
          { assigneeId: fixture.otherAssigneeId, count: 1 },
        ]),
      );
      expect(
        await repository.listMessages({
          limit: 10,
          offset: 0,
          sessionId: alice.session.id,
          storeId: scope.storeId,
          tenantId: scope.tenantId,
        }),
      ).toHaveLength(2);
      expect(
        await repository.listMessages({
          direction: "INBOUND",
          limit: 10,
          offset: 0,
          sessionId: alice.session.id,
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
          await repository.listSessions({
            ...query,
            storeId: fixture.sibling.storeId,
            tenantId: fixture.sibling.tenantId,
          })
        ).map(({ id }) => id),
      ).toEqual([sibling.session.id]);
      expect(
        (
          await repository.listSessions({
            ...query,
            storeId: fixture.foreign.storeId,
            tenantId: fixture.foreign.tenantId,
          })
        ).map(({ id }) => id),
      ).toEqual([foreign.session.id]);
      expect(
        await repository.listSessions({
          ...query,
          tenantId: fixture.foreign.tenantId,
        }),
      ).toEqual([]);
      expect(
        await repository.updateSession({
          expectedRevision: completed.revision,
          sessionId: carla.session.id,
          status: "ACTIVE",
          storeId: fixture.sibling.storeId,
          tenantId: fixture.sibling.tenantId,
        }),
      ).toBeNull();
      expect(
        await repository.updateSession({
          expectedRevision: carla.session.revision,
          sessionId: carla.session.id,
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
        .where(eq(schema.conversationCycles.id, carla.session.id));
      expect(canonicalCycle).toEqual({
        revision: completed.revision,
        state: "completed",
      });
    });
  });
});
