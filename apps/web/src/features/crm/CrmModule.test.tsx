// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmModule } from "./CrmModule";
import type { ProductCrmApi } from "./productCrmApi";

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
  });

  it("does not load lead or inventory data for the WhatsApp surface", () => {
    const api = createProductCrmApi();
    render(<CrmModule api={api} routeSurface="whatsapp" />);

    expect(screen.getByText("WhatsApp inbox")).toBeVisible();
    expect(api.listLeads).not.toHaveBeenCalled();
    expect(mocks.createInventoryApiOptions).not.toHaveBeenCalled();
    expect(mocks.listListings).not.toHaveBeenCalled();
  });
});

function createProductCrmApi(): ProductCrmApi {
  return {
    createActivity: vi.fn(async () => {
      throw new Error("createActivity should not be called");
    }),
    createLead: vi.fn(async () => {
      throw new Error("createLead should not be called");
    }),
    listActivities: vi.fn(async () => {
      throw new Error("listActivities should not be called");
    }),
    listLeads: vi.fn(async () => []),
    updateLead: vi.fn(async () => {
      throw new Error("updateLead should not be called");
    }),
  };
}
