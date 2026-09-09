import { describe, expect, it } from "vitest";
import {
  customServerFilters,
  getFilteredLeads,
  hasAnyClientFilter,
  type CustomFilters,
} from "./CrmPipelineViewFilters";
import type { LeadFilters } from "./crmPipelineModels";
import type { Pipeline } from "./crmPipelineStorage";
import type { ProductCrmLead } from "./productCrmTypes";

const pipeline: Pipeline = {
  description: "",
  id: "pipe-1",
  isDefault: true,
  name: "Pipeline",
  rotationActive: false,
  stages: [
    {
      color: "blue",
      id: "stage-1",
      isSystem: false,
      leadStatus: "new",
      name: "Novos",
      slaDays: null,
      status: "open",
    },
    {
      color: "green",
      id: "stage-2",
      isSystem: false,
      leadStatus: "qualified",
      name: "Qualificados",
      slaDays: null,
      status: "open",
    },
  ],
};

function createLead(overrides: Partial<ProductCrmLead>): ProductCrmLead {
  return {
    assignedUserId: null,
    buyerEmail: "lead@test.com",
    buyerName: "Test Lead",
    buyerPhone: null,
    createdAt: new Date().toISOString(),
    id: "lead-1",
    lastInteractionAt: new Date().toISOString(),
    listingId: null,
    metadata: {},
    pipelineId: "pipe-1",
    pipelineStageId: "stage-1",
    source: "manual",
    status: "new",
    storeId: "store-1",
    tenantId: "tenant-1",
    updatedAt: new Date().toISOString(),
    vehicleTitle: null,
    ...overrides,
  };
}

const emptyCustomFilters: CustomFilters = {
  origem: [],
  resposta: [],
  responsavel: undefined,
  semInteracao: "",
  veiculoId: undefined,
};

const defaultBaseFilters: LeadFilters = {
  search: "",
  source: "all",
  status: "all",
};

describe("getFilteredLeads", () => {
  it("uses server results directly and does not filter out leads with differing primary listingId (secondary interests match)", () => {
    // Lead has primary listingId 'car-primary', but server matched it for filter 'car-target'
    // via secondary vehicle interests. getFilteredLeads must preserve it!
    const leadWithSecondaryInterest = createLead({
      id: "lead-secondary",
      listingId: "car-primary",
    });

    const customFilters: CustomFilters = {
      ...emptyCustomFilters,
      veiculoId: "car-target",
    };

    const results = getFilteredLeads(
      [leadWithSecondaryInterest],
      pipeline,
      customFilters,
      defaultBaseFilters,
    );

    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe("lead-secondary");
  });

  it("does not filter out leads by origin or owner in the browser (delegates to server)", () => {
    const lead = createLead({
      assignedUserId: null,
      source: "whatsapp",
    });

    const customFilters: CustomFilters = {
      ...emptyCustomFilters,
      origem: ["instagram"], // Server will have executed this; browser must not drop
      responsavel: "me",
    };

    const results = getFilteredLeads(
      [lead],
      pipeline,
      customFilters,
      defaultBaseFilters,
    );

    expect(results).toHaveLength(1);
  });

  it("maintains response state, human attendance, and inactivity filters", () => {
    const now = Date.now();
    const leadActive = createLead({
      humanAttendanceState: "waiting_human",
      id: "lead-active",
      lastInteractionAt: new Date(now - 10 * 86400000).toISOString(),
      responseState: "responded",
    });
    const leadNoResp = createLead({
      humanAttendanceState: "in_human_service",
      id: "lead-no-resp",
      lastInteractionAt: new Date(now - 1 * 86400000).toISOString(),
      responseState: "no_response",
    });

    // Filter by responded only
    const respondedOnly = getFilteredLeads(
      [leadActive, leadNoResp],
      pipeline,
      { ...emptyCustomFilters, resposta: ["responded"] },
      defaultBaseFilters,
    );
    expect(respondedOnly.map((l) => l.id)).toEqual([
      "leadActive".replace("Active", "-active"),
    ]);

    // Filter by inactivity > 5 days
    const inactiveOnly = getFilteredLeads(
      [leadActive, leadNoResp],
      pipeline,
      { ...emptyCustomFilters, semInteracao: "5" },
      defaultBaseFilters,
    );
    expect(inactiveOnly.map((l) => l.id)).toEqual(["lead-active"]);

    // Filter by human attendance state
    const waitingOnly = getFilteredLeads(
      [leadActive, leadNoResp],
      pipeline,
      emptyCustomFilters,
      { ...defaultBaseFilters, humanAttendanceState: "waiting_human" },
    );
    expect(waitingOnly.map((l) => l.id)).toEqual(["lead-active"]);
  });
});

describe("customServerFilters", () => {
  it("maps custom origem to sources array, responsavel to assignee, and veiculoId to listingId", () => {
    const custom: CustomFilters = {
      origem: ["whatsapp", "instagram"],
      resposta: ["responded"],
      responsavel: "me",
      semInteracao: "7",
      veiculoId: "vehicle-123",
    };

    const serverFilters = customServerFilters(defaultBaseFilters, custom);

    expect(serverFilters.sources).toEqual(["whatsapp", "instagram"]);
    expect(serverFilters.assignee).toBe("me");
    expect(serverFilters.listingId).toBe("vehicle-123");
    expect(serverFilters.responseState).toBe("responded");
    expect(serverFilters.inactiveDays).toBe(7);
  });

  it("handles empty custom filters and maps them cleanly", () => {
    const serverFilters = customServerFilters(
      defaultBaseFilters,
      emptyCustomFilters,
    );

    expect(serverFilters.sources).toBeUndefined();
    expect(serverFilters.assignee).toBeUndefined();
    expect(serverFilters.listingId).toBeUndefined();
    expect(serverFilters.responseState).toBe("all");
    expect(serverFilters.inactiveDays).toBeNull();
  });
});

describe("hasAnyClientFilter", () => {
  it("returns false when all filters are default", () => {
    expect(hasAnyClientFilter(defaultBaseFilters, emptyCustomFilters)).toBe(
      false,
    );
  });

  it("returns true when sources, assignee, or listingId is active", () => {
    expect(
      hasAnyClientFilter(
        { ...defaultBaseFilters, sources: ["whatsapp"] },
        emptyCustomFilters,
      ),
    ).toBe(true);
    expect(
      hasAnyClientFilter(
        { ...defaultBaseFilters, assignee: "assigned" },
        emptyCustomFilters,
      ),
    ).toBe(true);
    expect(
      hasAnyClientFilter(
        { ...defaultBaseFilters, listingId: "car-123" },
        emptyCustomFilters,
      ),
    ).toBe(true);
    expect(
      hasAnyClientFilter(defaultBaseFilters, {
        ...emptyCustomFilters,
        origem: ["instagram"],
      }),
    ).toBe(true);
    expect(
      hasAnyClientFilter(defaultBaseFilters, {
        ...emptyCustomFilters,
        responsavel: "user-abc",
      }),
    ).toBe(true);
    expect(
      hasAnyClientFilter(defaultBaseFilters, {
        ...emptyCustomFilters,
        veiculoId: "car-456",
      }),
    ).toBe(true);
  });
});
