// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmModule } from "./CrmModule";
import type { ProductCrmApi } from "./productCrmApi";
import type { Pipeline } from "./crmPipelineStorage";
import type { ProductCrmLead } from "./productCrmTypes";

const mocks = vi.hoisted(() => ({
  createInventoryApiOptions: vi.fn(async () => ({})),
  listListings: vi.fn(async () => ({ items: [] })),
}));

vi.mock("../inventory/api/inventoryRuntimeApi", () => ({
  createInventoryApiOptions: mocks.createInventoryApiOptions,
}));

vi.mock("../inventory/api/apiClient", () => ({
  createInventoryApi: () => ({ listListings: mocks.listListings }),
}));

vi.mock("./CrmWhatsappInbox", () => ({
  CrmWhatsappInbox: () => <div>WhatsApp inbox</div>,
}));

describe("CrmModule", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
    window.location.hash = "";
  });

  it("does not load lead or inventory data for the WhatsApp surface", async () => {
    const api = createProductCrmApi();
    render(<CrmModule api={api} routeSurface="whatsapp" />);

    expect(await screen.findByText("WhatsApp inbox")).toBeVisible();
    expect(api.listLeadBoard).not.toHaveBeenCalled();
    expect(api.listLeadPage).not.toHaveBeenCalled();
    expect(api.listLeads).not.toHaveBeenCalled();
    expect(mocks.createInventoryApiOptions).not.toHaveBeenCalled();
    expect(mocks.listListings).not.toHaveBeenCalled();
  });

  it("loads stage pages without eagerly loading lead activities", async () => {
    const listLeadBoard = vi.fn(async () => ({ stages: [] }));
    const api = createProductCrmApi({
      listLeadBoard,
      listPipelines: vi.fn(async () => [pipeline]),
    });

    render(<CrmModule api={api} routeSurface="leads" />);

    await waitFor(() => expect(listLeadBoard).toHaveBeenCalledTimes(1));
    expect(listLeadBoard).toHaveBeenCalledWith({
      pipelineId: pipeline.id,
      stageLimit: 20,
    });
    expect(api.listActivities).not.toHaveBeenCalled();
  });

  it("loads a deep-linked lead even when it is absent from the board page", async () => {
    const lead = createLead();
    const getLead = vi.fn(async () => lead);
    const archiveLead = vi.fn(async () => ({
      ...lead,
      metadata: { archivedPreviousStatus: lead.status },
      status: "archived" as const,
    }));
    const api = createProductCrmApi({
      archiveLead,
      getLead,
      listActivities: vi.fn(async () => []),
      listLeadBoard: vi.fn(async () => ({ stages: [] })),
      listPipelines: vi.fn(async () => [pipeline]),
    });
    window.location.hash = `#/crm?surface=leads&leadId=${lead.id}`;

    render(<CrmModule api={api} routeSurface="leads" />);

    expect(
      await screen.findByRole("heading", { name: "Cliente WhatsApp" }),
    ).toBeVisible();
    expect(getLead).toHaveBeenCalledWith(lead.id);
    const archive = screen.getByRole("button", { name: "Arquivar lead" });
    expect(archive).toBeVisible();
    fireEvent.click(archive);
    await waitFor(() => expect(archiveLead).toHaveBeenCalledWith(lead.id));
    expect(
      screen.getByRole("button", { name: "Restaurar lead" }),
    ).toBeVisible();
  });

  it("sends one request for each settled board search term", async () => {
    const listLeadBoard = vi.fn(async () => ({ stages: [] }));
    const api = createProductCrmApi({
      listLeadBoard,
      listPipelines: vi.fn(async () => [pipeline]),
    });
    render(<CrmModule api={api} routeSurface="leads" />);
    await waitFor(() => expect(listLeadBoard).toHaveBeenCalledTimes(1));

    vi.useFakeTimers();
    const search = screen.getByRole("textbox", { name: "Buscar negócios" });
    fireEvent.change(search, { target: { value: "a" } });
    expect(listLeadBoard).toHaveBeenCalledTimes(1);
    await act(async () => vi.advanceTimersByTimeAsync(500));
    expect(listLeadBoard).toHaveBeenCalledTimes(2);
    expect(listLeadBoard).toHaveBeenLastCalledWith({
      pipelineId: pipeline.id,
      search: "a",
      stageLimit: 20,
    });

    fireEvent.change(search, { target: { value: "an" } });
    await act(async () => vi.advanceTimersByTimeAsync(500));
    expect(listLeadBoard).toHaveBeenCalledTimes(3);
    expect(listLeadBoard).toHaveBeenLastCalledWith({
      pipelineId: pipeline.id,
      search: "an",
      stageLimit: 20,
    });
  });
});

function createProductCrmApi(
  overrides: Partial<ProductCrmApi> = {},
): ProductCrmApi {
  return {
    createActivity: vi.fn(async () => {
      throw new Error("createActivity should not be called");
    }),
    createFinancialProduct: vi.fn(async () => {
      throw new Error("createFinancialProduct should not be called");
    }),
    createLead: vi.fn(async () => {
      throw new Error("createLead should not be called");
    }),
    createPipeline: vi.fn(async () => {
      throw new Error("createPipeline should not be called");
    }),
    deletePipeline: vi.fn(async () => {
      throw new Error("deletePipeline should not be called");
    }),
    listActivities: vi.fn(async () => {
      throw new Error("listActivities should not be called");
    }),
    listLeadBoard: vi.fn(async () => {
      throw new Error("listLeadBoard should not be called");
    }),
    listLeadPage: vi.fn(async () => {
      throw new Error("listLeadPage should not be called");
    }),
    listLeads: vi.fn(async () => []),
    listPipelines: vi.fn(async () => []),
    moveLeadPipelineStage: vi.fn(async () => {
      throw new Error("moveLeadPipelineStage should not be called");
    }),
    updatePipeline: vi.fn(async () => {
      throw new Error("updatePipeline should not be called");
    }),
    updateLead: vi.fn(async () => {
      throw new Error("updateLead should not be called");
    }),
    ...overrides,
  };
}

const pipeline: Pipeline = {
  description: "",
  id: "11111111-1111-4111-8111-111111111111",
  isDefault: true,
  name: "Sales",
  rotationActive: false,
  routingRules: [],
  stages: [
    {
      color: "var(--color-accent)",
      id: "22222222-2222-4222-8222-222222222222",
      isSystem: false,
      leadStatus: "new",
      name: "New",
      slaDays: 1,
      status: "open",
    },
  ],
};

function createLead(): ProductCrmLead {
  const timestamp = "2026-08-13T12:00:00.000Z";
  return {
    assignedUserId: null,
    buyerEmail: null,
    buyerName: "Cliente WhatsApp",
    buyerPhone: "5511999999999",
    createdAt: timestamp,
    id: "33333333-3333-4333-8333-333333333333",
    lastInteractionAt: timestamp,
    listingId: null,
    metadata: {},
    pipelineId: pipeline.id,
    pipelineStageId: pipeline.stages[0]?.id ?? null,
    source: "whatsapp",
    status: "new",
    storeId: "store_1",
    tenantId: "tenant_1",
    updatedAt: timestamp,
    vehicleTitle: null,
  };
}
