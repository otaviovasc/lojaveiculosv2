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
  it("applies unit status filters from the toolbar", async () => {
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
      screen.getByRole("button", { name: "Filtrar por status" }),
    );
    await user.click(await screen.findByRole("option", { name: "Reservado" }));

    await waitFor(() =>
      expect(api.listListings).toHaveBeenLastCalledWith({
        limit: 100,
        status: "reserved",
      }),
    );
    const statusFilter = screen.getByRole("button", {
      name: "Filtrar por status",
    });
    expect(within(statusFilter).getByText("Reservado")).toBeVisible();
  });
});

function createInventoryApiStub() {
  const items = [
    summary("listing_available", "published", "available"),
    summary("listing_reserved", "published", "reserved"),
    summary("listing_sold", "sold_out", "sold"),
  ];

  const listListings = vi.fn(async (input?: ListInventoryInput) => {
    const filtered = input?.status
      ? items.filter((item) =>
          item.units.some((unit) => unit.status === input.status),
        )
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
  unitStatus: InventoryListingSummary["units"][number]["status"],
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
      title: `Veiculo ${unitStatus}`,
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
      status: unitStatus,
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
        status: unitStatus,
        stockNumber: "STK-1",
        storeId: "store_1",
        tenantId: "tenant_1",
        updatedAt: "2026-01-01T00:00:00.000Z",
        vin: null,
      },
    ],
  };
}
