// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { InventoryApi } from "../api/apiClient";
import type { InventoryCatalogSnapshot } from "../model/types";
import { InventoryCatalogSelector } from "./InventoryCatalogSelector";

afterEach(cleanup);

describe("InventoryCatalogSelector saved catalog hydration", () => {
  it("restores the model family and fetches version options for an edit", async () => {
    const catalog = createCatalog();
    const listCatalogVersions = vi.fn(async () => [
      {
        code: "4828",
        modelFamilyCode: "toro",
        modelFamilyName: "Toro",
        name: "Toro Volcano 2.0 16V 4x4 TB Diesel Aut.",
      },
      {
        code: "9999",
        modelFamilyCode: "toro",
        modelFamilyName: "Toro",
        name: "Toro Freedom 1.3 Turbo Flex Aut.",
      },
    ]);
    const api = {
      getCatalogSnapshot: vi.fn(async () => catalog),
      listCatalogBrands: vi.fn(async () => [{ code: "21", name: "Fiat" }]),
      listCatalogModels: vi.fn(async () => [{ code: "toro", name: "Toro" }]),
      listCatalogVersions,
      listCatalogYears: vi.fn(async () => [
        {
          code: "2024-1",
          fuelCode: "1",
          modelYear: 2024,
          name: "2024 Diesel",
        },
      ]),
    } as unknown as InventoryApi;
    const user = userEvent.setup();

    render(
      <InventoryCatalogSelector
        api={api}
        catalog={catalog}
        manufactureYear="2023"
        onCatalogChange={vi.fn()}
        onManufactureYearChange={vi.fn()}
      />,
    );

    await waitFor(() =>
      expect(listCatalogVersions).toHaveBeenCalledWith("21", "toro", "cars"),
    );
    await waitFor(() =>
      expect(api.getCatalogSnapshot).toHaveBeenCalledWith({
        brandCode: "21",
        modelCode: "4828",
        modelFamilyCode: "toro",
        modelFamilyName: "Toro",
        vehicleType: "cars",
        yearCode: "2024-1",
      }),
    );
    await user.click(screen.getByRole("combobox", { name: "Versão FIPE" }));

    expect(
      screen.getByRole("option", {
        name: "Toro Freedom 1.3 Turbo Flex Aut.",
      }),
    ).toBeVisible();
  });
});

function createCatalog(): InventoryCatalogSnapshot {
  return {
    brandCode: "21",
    brandLogoUrl: null,
    brandName: "Fiat",
    fipeCode: "001267-0",
    fuel: "Diesel",
    modelCode: "4828",
    modelFamilyCode: "toro",
    modelFamilyName: "Toro",
    modelName: "Toro Volcano 2.0 16V 4x4 TB Diesel Aut.",
    modelYear: 2024,
    priceCents: 126_900_00,
    referenceMonth: "agosto de 2026",
    source: "fipe",
    vehicleType: "cars",
    yearCode: "2024-1",
    yearName: "2024 Diesel",
  };
}
