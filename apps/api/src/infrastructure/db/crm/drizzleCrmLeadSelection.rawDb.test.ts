import { randomUUID } from "node:crypto";
import * as schema from "@lojaveiculosv2/db";
import type { StoreId, TenantId, UserId } from "@lojaveiculosv2/shared";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { describe, expect, it } from "vitest";
import { loadLocalEnv } from "../../config/loadLocalEnv.js";
import { createDrizzleCrmRepository } from "./drizzleCrmRepository.js";
import { leadPageCursor } from "../../../domains/crm/leadOperationalFilters.js";

loadLocalEnv();
describe.skipIf(process.env.RUN_RAW_CRM_DB_TESTS !== "true")(
  "CRM selection SQL",
  () => {
    it("counts and pages filtered sellers including secondary vehicle interests without duplicates", async () => {
      const url = new URL(process.env.DATABASE_URL ?? "");
      if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname))
        throw new Error("Local database required.");
      const client = postgres(url.toString(), { max: 1 });
      const rollback = Symbol("rollback");
      try {
        await drizzle(client, { schema }).transaction(async (tx) => {
          const [store] = await tx.select().from(schema.stores).limit(1);
          const [user] = await tx.select().from(schema.users).limit(1);
          if (!store || !user) throw new Error("Seed local store/user first.");
          const scope = {
            storeId: store.id as StoreId,
            tenantId: store.tenantId as TenantId,
          };
          const listings = await tx
            .select({ id: schema.vehicleListings.id })
            .from(schema.vehicleListings)
            .where(eq(schema.vehicleListings.storeId, store.id))
            .limit(2);
          if (listings.length < 2)
            throw new Error("Seed two local listings first.");
          const [pipeline] = await tx
            .insert(schema.crmPipelines)
            .values({ ...scope, name: `Selection ${randomUUID()}` })
            .returning();
          const [stage] = await tx
            .insert(schema.crmPipelineStages)
            .values({
              ...scope,
              pipelineId: pipeline!.id,
              name: "New",
              sortOrder: 0,
              leadStatus: "new",
            })
            .returning();
          const repo = createDrizzleCrmRepository(tx);
          const expected: string[] = [];
          for (let i = 0; i < 49; i++) {
            const matches = i < 23;
            const lead = await repo.createLead({
              ...scope,
              pipelineId: pipeline!.id,
              pipelineStageId: stage!.id,
              buyerName: `Selection fixture ${i}`,
              source: matches ? "whatsapp" : "manual",
              assignedUserId: matches ? (user.id as UserId) : null,
              listingId: listings[0]!.id,
            });
            if (matches) {
              expected.push(lead.id);
              await tx.insert(schema.leadVehicleInterests).values([
                { ...scope, leadId: lead.id, listingId: listings[1]!.id },
                { ...scope, leadId: lead.id, listingId: listings[1]!.id },
              ]);
            }
          }
          const filters = {
            ...scope,
            pipelineId: pipeline!.id,
            sources: ["whatsapp" as const],
            assignee: user.id,
            listingId: listings[1]!.id,
            sortBy: "created_at" as const,
          };
          const board = await repo.listLeadBoard({
            ...filters,
            stageLimit: 20,
          });
          expect(board[0]?.total).toBe(23);
          expect(board[0]?.items).toHaveLength(20);
          expect(await repo.countLeads(filters)).toBe(23);
          const second = await repo.listLeads({
            ...filters,
            limit: 20,
            cursor: leadPageCursor(board[0]!.items.at(-1)!, "created_at"),
          });
          expect(second).toHaveLength(3);
          expect(
            [...board[0]!.items, ...second].map((lead) => lead.id).sort(),
          ).toEqual(expected.sort());
          expect(
            await repo.countLeads({ ...filters, assignee: "unassigned" }),
          ).toBe(0);
          expect(
            await repo.countLeads({ ...filters, sources: ["manual"] }),
          ).toBe(0);
          expect(
            await repo.countLeads({
              ...filters,
              storeId: randomUUID() as StoreId,
            }),
          ).toBe(0);
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
