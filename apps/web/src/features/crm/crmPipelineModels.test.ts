import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildLeadContactPatch,
  createTaskActivityInput,
  deriveLeadStats,
  filterLeads,
  formatRelativeDate,
  groupLeadsByStatus,
  readTaskMetadata,
} from "./crmPipelineModels";
import type { ProductCrmLead, ProductCrmLeadActivity } from "./productCrmTypes";

const lead = {
  assignedUserId: null,
  buyerEmail: "ana@example.com",
  buyerName: "Ana Souza",
  buyerPhone: "(11) 99999-0000",
  createdAt: "2026-06-22T12:00:00.000Z",
  id: "lead-1",
  lastInteractionAt: null,
  listingId: null,
  metadata: {},
  pipelineId: null,
  pipelineStageId: null,
  source: "manual",
  status: "new",
  storeId: "store-1",
  tenantId: "tenant-1",
  updatedAt: "2026-06-22T12:00:00.000Z",
  vehicleTitle: "Corolla XEi",
} satisfies ProductCrmLead;

afterEach(() => {
  vi.useRealTimers();
});

describe("CRM pipeline models", () => {
  it("omits an unchanged phone from a contact patch", () => {
    expect(
      buildLeadContactPatch(
        { buyerPhone: "11999990000" },
        { buyerName: "Ana", buyerPhone: "(11) 99999-0000" },
      ),
    ).toEqual({ buyerName: "Ana" });
    expect(
      buildLeadContactPatch(
        { buyerPhone: "11999990000" },
        { buyerName: "Ana" },
      ),
    ).toEqual({ buyerName: "Ana" });
  });

  it("normalizes only a changed phone in a contact patch", () => {
    expect(
      buildLeadContactPatch(
        { buyerPhone: "11999990000" },
        { buyerPhone: "+55 (21) 98888-7777" },
      ),
    ).toEqual({ buyerPhone: "21988887777" });
    expect(
      buildLeadContactPatch({ buyerPhone: "11999990000" }, { buyerPhone: "" }),
    ).toEqual({ buyerPhone: null });
  });

  it("filters leads by search, source, and status", () => {
    const wonLead: ProductCrmLead = {
      ...lead,
      id: "lead-2",
      source: "olx",
      status: "won",
    };

    expect(
      filterLeads([lead, wonLead], {
        search: "corolla",
        source: "manual",
        status: "new",
      }),
    ).toEqual([lead]);
  });

  it("groups leads by V2 pipeline status", () => {
    const grouped = groupLeadsByStatus([
      lead,
      { ...lead, id: "lead-2", status: "contacted" },
    ]);

    expect(grouped.new).toHaveLength(1);
    expect(grouped.contacted).toHaveLength(1);
    expect(grouped.won).toHaveLength(0);
  });

  it("creates and reads V2 task activity metadata", () => {
    const input = createTaskActivityInput(
      "Ligar para proposta",
      "2027-01-01T09:00",
    );
    const activity = {
      ...baseActivity(),
      activityType: input.activityType,
      content: input.content,
      metadata: input.metadata ?? {},
    } satisfies ProductCrmLeadActivity;

    expect(input).toMatchObject({
      activityType: "task",
      direction: "internal",
      metadata: {
        dueAt: "2027-01-01T09:00",
        title: "Ligar para proposta",
      },
    });
    expect(readTaskMetadata(activity)).toEqual({
      dueAt: "2027-01-01T09:00",
      title: "Ligar para proposta",
    });
  });

  it("derives open, won, and task stats", () => {
    expect(
      deriveLeadStats(
        [lead, { ...lead, id: "lead-2", status: "won" }],
        [{ ...baseActivity(), activityType: "task" }],
      ),
    ).toMatchObject({ open: 1, taskCount: 1, total: 2, won: 1 });
  });

  it("formats relative dates with Portuguese accents", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-22T12:00:00.000Z"));

    expect(formatRelativeDate(null)).toBe("Sem interação");
    expect(formatRelativeDate("2026-06-22T11:59:20.000Z")).toBe("1 min atrás");
    expect(formatRelativeDate("2026-06-22T10:00:00.000Z")).toBe("2 h atrás");
    expect(formatRelativeDate("2026-06-19T12:00:00.000Z")).toBe("3 d atrás");
  });
});

function baseActivity(): ProductCrmLeadActivity {
  return {
    activityType: "note",
    content: "Contato registrado",
    createdAt: "2026-06-22T12:00:00.000Z",
    createdByUserId: null,
    direction: "internal",
    id: "activity-1",
    leadId: "lead-1",
    metadata: {},
    occurredAt: "2026-06-22T12:00:00.000Z",
    priority: 0,
    storeId: "store-1",
    tenantId: "tenant-1",
    updatedAt: "2026-06-22T12:00:00.000Z",
  };
}
