import { randomUUID } from "node:crypto";
import * as schema from "@lojaveiculosv2/db";
import type { StoreId, TenantId } from "@lojaveiculosv2/shared";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { describe, expect, it } from "vitest";
import { loadLocalEnv } from "../../config/loadLocalEnv.js";
import { createDrizzleCrmRepository } from "./drizzleCrmRepository.js";
import { leadPageCursor } from "../../../domains/crm/leadOperationalFilters.js";

loadLocalEnv();
describe.skipIf(process.env.RUN_RAW_CRM_DB_TESTS !== "true")(
  "CRM operational SQL",
  () => {
    it("projects communication, human attendance and pending tasks before counting and paging", async () => {
      const url = new URL(process.env.DATABASE_URL ?? "");
      if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname))
        throw new Error("This test requires a local database.");
      const client = postgres(url.toString(), { max: 1 });
      const db = drizzle(client, { schema });
      const rollback = Symbol("rollback");
      try {
        await db.transaction(async (tx) => {
          const [store] = await tx.select().from(schema.stores).limit(1);
          if (!store) throw new Error("Seed a local store first.");
          const scope = {
            storeId: store.id as StoreId,
            tenantId: store.tenantId as TenantId,
          };
          const [pipeline] = await tx
            .insert(schema.crmPipelines)
            .values({ ...scope, name: `Operational ${randomUUID()}` })
            .returning();
          const [stage] = await tx
            .insert(schema.crmPipelineStages)
            .values({
              ...scope,
              pipelineId: pipeline!.id,
              name: "Novo",
              sortOrder: 0,
              leadStatus: "new",
            })
            .returning();
          const repo = createDrizzleCrmRepository(tx);
          const leads = [];
          for (let i = 0; i < 4; i++)
            leads.push(
              await repo.createLead({
                ...scope,
                buyerName: `SQL Lead ${i}`,
                pipelineId: pipeline!.id,
                pipelineStageId: stage!.id,
                source: "manual",
              }),
            );
          for (let i = 0; i < 3; i++)
            await repo.createActivity({
              ...scope,
              leadId: leads[i]!.id,
              activityType: "task",
              content: `Task ${i}`,
              metadata: { dueAt: `2026-09-${10 + i}T10:00:00-03:00` },
            });
          await repo.createActivity({
            ...scope,
            leadId: leads[0]!.id,
            activityType: "task",
            content: "Invalid date",
            metadata: { dueAt: "not-a-date" },
          });
          await repo.createActivity({
            ...scope,
            leadId: leads[0]!.id,
            activityType: "task",
            content: "Completed",
            metadata: { dueAt: "2020-01-01T12:00:00Z", completed: true },
          });
          await repo.updateLead({
            ...scope,
            leadId: leads[0]!.id,
            status: "qualified",
          });
          const [connection] = await tx
            .insert(schema.crmChannelConnections)
            .values({
              ...scope,
              broker: "direct",
              channel: "whatsapp",
              provider: "zapi",
              displayName: "Local SQL test",
              state: "active",
            })
            .returning();
          const [thread] = await tx
            .insert(schema.conversationThreads)
            .values({
              ...scope,
              channel: "whatsapp",
              providerConnectionId: connection!.id,
            })
            .returning();
          const [cycle] = await tx
            .insert(schema.conversationCycles)
            .values({
              ...scope,
              threadId: thread!.id,
              metadata: { leadId: leads[1]!.id },
            })
            .returning();
          await tx.insert(schema.conversationAttendances).values({
            ...scope,
            cycleId: cycle!.id,
            threadId: thread!.id,
            state: "handoff_requested",
            handoffRequestedAt: new Date(),
          });
          await tx.insert(schema.crmMessages).values({
            ...scope,
            cycleId: cycle!.id,
            threadId: thread!.id,
            providerConnectionId: connection!.id,
            provider: "zapi",
            direction: "outbound",
            status: "sent",
            content: "Sent",
            occurredAt: new Date(Date.now() - 10 * 86400000),
          });
          await tx.insert(schema.crmMessages).values({
            ...scope,
            cycleId: cycle!.id,
            threadId: thread!.id,
            providerConnectionId: connection!.id,
            provider: "zapi",
            direction: "outbound",
            status: "failed",
            content: "Failed recently",
          });
          const detail = await repo.findLeadById({
            ...scope,
            leadId: leads[1]!.id,
          });
          expect(detail).toMatchObject({
            responseState: "responded",
            humanAttendanceState: "waiting_human",
            nextTask: { title: "Task 1" },
          });
          const filters = { ...scope, pipelineId: pipeline!.id };
          expect(
            await repo.countLeads({
              ...filters,
              responseState: "responded",
              inactiveDays: 7,
            }),
          ).toBe(1);
          expect(
            await repo.countLeads({
              ...filters,
              humanAttendanceState: "waiting_human",
            }),
          ).toBe(1);
          const board = await repo.listLeadBoard({
            ...filters,
            sortBy: "next_task",
            stageLimit: 2,
          });
          expect(board[0]?.total).toBe(4);
          expect(board[0]?.items.map((l) => l.id)).toEqual([
            leads[0]!.id,
            leads[1]!.id,
          ]);
          expect(board[0]?.items[0]?.nextTask?.title).toBe("Task 0");
          expect(board[0]?.items[0]?.responseState).toBe("no_response");
          expect(board[0]?.items[0]?.lastInteractionAt).toBeNull();
          const next = await repo.listLeads({
            ...filters,
            sortBy: "next_task",
            cursor: leadPageCursor(board[0]!.items[1]!, "next_task"),
            limit: 2,
          });
          expect(next.map((l) => l.id)).toEqual([leads[2]!.id, leads[3]!.id]);
          expect(
            await repo.listLeads({
              ...filters,
              sortBy: "next_task",
              cursor: leadPageCursor(next[1]!, "next_task"),
              limit: 2,
            }),
          ).toEqual([]);
          throw rollback;
        });
      } catch (error) {
        if (error !== rollback) throw error;
      } finally {
        await client.end();
      }
    });
  },
);
