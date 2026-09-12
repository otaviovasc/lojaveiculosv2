import type { StoreId, TenantId, UserId } from "@lojaveiculosv2/shared";
import { describe, expect, it } from "vitest";
import { createMemoryCrmRepository } from "../adapters/memory/crmRepository.js";
import { createTestApp } from "./crm.controller.testSupport.js";
import { resolvedLeadFilters } from "../../../domains/crm/leadOperationalFilters.js";
import { createServiceContext } from "../../../shared/serviceContext.js";

const scope = {
  storeId: "store_1" as StoreId,
  tenantId: "tenant_1" as TenantId,
};
const pipelineId = "22222222-2222-4222-8222-222222222222";
const stageId = "11111111-1111-4111-8111-111111111111";
const listingId = "33333333-3333-4333-8333-333333333333";
const seller = "02020202-0202-4202-8202-020202020202" as UserId;
type Page = {
  leads: { id: string }[];
  total: number;
  nextCursor: string | null;
};

describe("Kanban server selection", () => {
  it("selects sellers, sources and vehicles before the first 20 and preserves totals on following pages", async () => {
    const repo = createMemoryCrmRepository();
    const app = createTestApp({
      crmRepository: repo,
      permissions: ["lead.read"],
    });
    const expected = [];
    for (let i = 0; i < 49; i++) {
      const matches = i < 23;
      const lead = await repo.createLead({
        ...scope,
        pipelineId,
        pipelineStageId: stageId,
        buyerName: `Contact ${i}`,
        source: matches ? (i % 2 ? "instagram" : "whatsapp") : "manual",
        assignedUserId: matches ? seller : null,
        listingId,
      });
      if (matches) expected.push(lead.id);
    }
    await repo.createLead({
      ...scope,
      storeId: "other_store" as StoreId,
      pipelineId,
      pipelineStageId: stageId,
      source: "whatsapp",
      assignedUserId: seller,
      listingId,
    });
    const query = `pipelineId=${pipelineId}&assignee=me&sources=whatsapp,instagram&listingId=${listingId}&sortBy=created_at`;
    const response = await app.request(
      `/api/v1/crm/leads/board?${query}&stageLimit=20`,
    );
    expect(response.status).toBe(200);
    const board = (await response.json()) as { stages: Page[] };
    expect(board.stages[0]?.total).toBe(23);
    expect(board.stages[0]?.leads).toHaveLength(20);
    const next = await app.request(
      `/api/v1/crm/leads?${query}&pipelineStageId=${stageId}&limit=20&cursor=${board.stages[0]!.nextCursor}`,
    );
    const second = (await next.json()) as Page;
    expect(second.total).toBe(23);
    expect(second.leads).toHaveLength(3);
    expect(second.nextCursor).toBeNull();
    expect(
      [...board.stages[0]!.leads, ...second.leads]
        .map((lead) => lead.id)
        .sort(),
    ).toEqual(expected.sort());
    for (const [assignee, count] of [
      [seller, 23],
      ["assigned", 23],
      ["unassigned", 26],
      ["44444444-4444-4444-8444-444444444444", 0],
    ] as const) {
      const page = (await (
        await app.request(
          `/api/v1/crm/leads?pipelineId=${pipelineId}&assignee=${assignee}`,
        )
      ).json()) as Page;
      expect(page.total).toBe(count);
    }
    const reset = (await (
      await app.request(`/api/v1/crm/leads?pipelineId=${pipelineId}`)
    ).json()) as Page;
    expect(reset.total).toBe(49);
    const none = (await (
      await app.request(`/api/v1/crm/leads?${query}&source=manual`)
    ).json()) as Page;
    expect(none.total).toBe(0);
  });

  it("rejects malformed selectors on both routes and retains read permissions", async () => {
    const app = createTestApp({ permissions: ["lead.read"] });
    for (const route of ["leads", `leads/board`]) {
      for (const query of [
        "assignee=clerk_external",
        "sources=made_up",
        "sources=",
        "sources=manual,",
        "listingId=wrong",
      ]) {
        expect(
          (
            await app.request(
              `/api/v1/crm/${route}?pipelineId=${pipelineId}&${query}`,
            )
          ).status,
        ).toBe(400);
      }
      expect(
        (
          await createTestApp({ permissions: [] }).request(
            `/api/v1/crm/${route}?pipelineId=${pipelineId}&assignee=me`,
          )
        ).status,
      ).toBe(403);
    }
  });

  it("resolves mine from the internal actor, never the external identity or an integration", () => {
    const context = createServiceContext({
      actor: { kind: "user", id: seller, externalId: "clerk_external" },
      request: { requestId: "selection-test" },
    });
    expect(resolvedLeadFilters(context, { assignee: "me" })).toEqual({
      assignee: seller,
    });
    expect(() =>
      resolvedLeadFilters(
        { ...context, actor: { kind: "integration", id: seller } },
        { assignee: "me" },
      ),
    ).toThrow("authenticated store user");
  });
});
