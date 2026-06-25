// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { InventoryApi } from "../api/apiClient";
import type { ListInventoryInput } from "../api/apiRoutes";
import type {
  InventoryListingList,
  InventoryListingSummary,
} from "../model/types";
import { InventoryListPage } from "./InventoryListPage";

vi.mock("../../../components/ui/AnimatedContent", () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("../../../components/ui/CountUp", () => ({
  AnimatedCounter: ({ value }: { value: number | string }) => <>{value}</>,
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("InventoryListPage", () => {
  it("applies a status filter when a summary card is clicked", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 200 })),
    );
    const api = createInventoryApiStub();
    const user = userEvent.setup();

    render(<InventoryListPage api={api} />);

    await waitFor(() =>
      expect(api.listListings).toHaveBeenCalledWith({ limit: 100 }),
    );

    await user.click(
      screen.getByRole("button", {
        name: "Filtrar estoque por Disponíveis",
      }),
    );

    await waitFor(() =>
      expect(api.listListings).toHaveBeenLastCalledWith({
        limit: 100,
        status: "available",
      }),
    );
    const statusFilter = screen.getByRole("button", {
      name: "Filtrar por status",
    });
    expect(within(statusFilter).getByText("Disponivel")).toBeVisible();
  });
});

function createInventoryApiStub() {
  const items = [
    summary("listing_available", "available"),
    summary("listing_reserved", "reserved"),
    summary("listing_sold", "sold"),
  ];

  const listListings = vi.fn(async (input?: ListInventoryInput) => {
    const filtered = input?.status
      ? items.filter((item) => item.listing.status === input.status)
      : items;
    return {
      hasMore: false,
      items: filtered,
      nextOffset: null,
      total: filtered.length,
    } satisfies InventoryListingList;
  });

  return {
    listListings,
  } as unknown as InventoryApi & {
    listListings: typeof listListings;
  };
}

function summary(
  id: string,
  status: InventoryListingSummary["listing"]["status"],
): InventoryListingSummary {
  return {
    listing: {
      catalog: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      description: null,
      doors: null,
      engineAspiration: null,
      engineDisplacement: null,
      fuelType: null,
      id,
      internalNotes: null,
      manufactureYear: 2024,
      mileageKm: null,
      modelYear: 2025,
      plate: null,
      priceCents: 12345678,
      status,
      storeId: "store_1",
      tenantId: "tenant_1",
      title: `Veiculo ${status}`,
      transmission: null,
      trimName: null,
      unitIds: ["unit_1"],
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    mediaCount: 0,
    primaryMediaUrl: null,
    primaryUnit: {
      colorName: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      id: "unit_1",
      listingId: id,
      plate: "ABC1D23",
      status: "available",
      stockNumber: "STK-1",
      storeId: "store_1",
      tenantId: "tenant_1",
      updatedAt: "2026-01-01T00:00:00.000Z",
      vin: null,
    },
    units: [
      {
        colorName: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        id: "unit_1",
        listingId: id,
        plate: "ABC1D23",
        status: "available",
        stockNumber: "STK-1",
        storeId: "store_1",
        tenantId: "tenant_1",
        updatedAt: "2026-01-01T00:00:00.000Z",
        vin: null,
      },
    ],
  };
}
