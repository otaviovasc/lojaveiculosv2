import type {
  VehicleCatalogOption,
  VehicleCatalogProvider,
  VehicleCatalogSnapshot,
  VehicleCatalogType,
  VehicleCatalogYearOption,
} from "../../domains/vehicle/ports/vehicleCatalogProvider.js";

const defaultBaseUrl = "https://parallelum.com.br/fipe/api/v2";

export function createFipeVehicleCatalogProvider({
  baseUrl = defaultBaseUrl,
  fetch = globalThis.fetch,
  token,
}: {
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
  token?: string | undefined;
} = {}): VehicleCatalogProvider {
  const request = async <T>(path: string): Promise<T> => {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
      headers: token ? { "X-Subscription-Token": token } : {},
    });
    if (!response.ok) {
      throw new FipeCatalogProviderError(response.status, path);
    }
    return (await response.json()) as T;
  };

  return {
    getVehicle: async (input) => {
      const details = await request<FipeVehicleDetails>(
        `/${input.vehicleType}/brands/${input.brandCode}/models/${input.modelCode}/years/${input.yearCode}`,
      );
      return toCatalogSnapshot({ ...input, details });
    },
    listBrands: async ({ vehicleType }) =>
      (await request<FipeOption[]>(`/${vehicleType}/brands`)).map(toOption),
    listModels: async ({ brandCode, vehicleType }) =>
      (
        await request<FipeOption[]>(
          `/${vehicleType}/brands/${brandCode}/models`,
        )
      ).map(toOption),
    listYears: async ({ brandCode, modelCode, vehicleType }) =>
      (
        await request<FipeOption[]>(
          `/${vehicleType}/brands/${brandCode}/models/${modelCode}/years`,
        )
      ).map(toYearOption),
  };
}

export class FipeCatalogProviderError extends Error {
  constructor(status: number, path: string) {
    super(`FIPE catalog request failed with status ${status}: ${path}`);
    this.name = "FipeCatalogProviderError";
  }
}

type FipeOption = {
  code: string | number;
  name: string;
};

type FipeVehicleDetails = {
  brand: string;
  codeFipe: string;
  fuel: string;
  model: string;
  modelYear: number;
  price: string;
  referenceMonth: string;
};

function toOption(input: FipeOption): VehicleCatalogOption {
  return { code: String(input.code), name: input.name };
}

function toYearOption(input: FipeOption): VehicleCatalogYearOption {
  const code = String(input.code);
  const modelYear = Number.parseInt(code.slice(0, 4), 10);
  const fuelCode = code.includes("-") ? (code.split("-")[1] ?? null) : null;
  return {
    ...toOption(input),
    fuelCode,
    modelYear: Number.isFinite(modelYear) ? modelYear : null,
  };
}

function toCatalogSnapshot(input: {
  brandCode: string;
  details: FipeVehicleDetails;
  modelCode: string;
  vehicleType: VehicleCatalogType;
  yearCode: string;
}): VehicleCatalogSnapshot {
  return {
    brandCode: input.brandCode,
    brandName: input.details.brand,
    fipeCode: input.details.codeFipe,
    fuel: input.details.fuel,
    modelCode: input.modelCode,
    modelName: input.details.model,
    modelYear: input.details.modelYear,
    referenceMonth: input.details.referenceMonth,
    source: "fipe",
    vehicleType: input.vehicleType,
    yearCode: input.yearCode,
    yearName: String(input.details.modelYear),
  };
}
