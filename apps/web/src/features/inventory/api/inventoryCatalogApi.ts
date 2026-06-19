import { createInventoryHeaders, inventoryRoutes } from "./apiRoutes";
import type {
  InventoryAuth,
  InventoryCatalogOption,
  InventoryCatalogSnapshot,
  InventoryCatalogVehicleType,
  InventoryCatalogVersionOption,
  InventoryCatalogYearOption,
} from "../model/types";

export type InventoryCatalogApi = ReturnType<typeof createInventoryCatalogApi>;

export function createInventoryCatalogApi({
  auth,
  baseUrl,
  fetch,
}: {
  auth: InventoryAuth;
  baseUrl?: string;
  fetch: typeof window.fetch;
}) {
  const read = <T>(route: string) =>
    fetch(route, { headers: createInventoryHeaders(auth) }).then(readJson<T>);

  const listCatalogBrands = (
    vehicleType: InventoryCatalogVehicleType = "cars",
  ) =>
    read<readonly InventoryCatalogOption[]>(
      inventoryRoutes.catalogBrands({ vehicleType }, baseUrl),
    );

  const listCatalogModels = (
    brandCode: string,
    vehicleType: InventoryCatalogVehicleType = "cars",
  ) =>
    read<readonly InventoryCatalogOption[]>(
      inventoryRoutes.catalogModels(brandCode, { vehicleType }, baseUrl),
    );

  const listCatalogYears = (
    brandCode: string,
    versionCode: string,
    vehicleType: InventoryCatalogVehicleType = "cars",
  ) =>
    read<readonly InventoryCatalogYearOption[]>(
      inventoryRoutes.catalogYears(
        brandCode,
        versionCode,
        { vehicleType },
        baseUrl,
      ),
    );

  const listCatalogVersions = (
    brandCode: string,
    modelFamilyCode: string,
    vehicleType: InventoryCatalogVehicleType = "cars",
  ) =>
    read<readonly InventoryCatalogVersionOption[]>(
      inventoryRoutes.catalogVersions(
        brandCode,
        modelFamilyCode,
        { vehicleType },
        baseUrl,
      ),
    );

  const getCatalogSnapshot = (input: {
    brandCode: string;
    modelCode: string;
    vehicleType?: InventoryCatalogVehicleType;
    yearCode: string;
  }) =>
    read<InventoryCatalogSnapshot>(
      inventoryRoutes.catalogSnapshot(input, baseUrl),
    );

  return {
    getCatalogSnapshot,
    listCatalogBrands,
    listCatalogModels,
    listCatalogVersions,
    listCatalogYears,
  };
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Inventory request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}
