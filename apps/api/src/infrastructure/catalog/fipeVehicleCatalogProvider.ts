import type {
  VehicleCatalogOption,
  VehicleCatalogProvider,
  VehicleCatalogSnapshot,
  VehicleCatalogType,
  VehicleCatalogYearOption,
} from "../../domains/vehicle/ports/vehicleCatalogProvider.js";

const defaultBaseUrl = "https://parallelum.com.br/fipe/api/v2";
const defaultMaxAttempts = 5;
const defaultRetryBaseDelayMs = 1_000;
const maxRetryDelayMs = 60_000;

export function createFipeVehicleCatalogProvider({
  baseUrl = defaultBaseUrl,
  fetch = globalThis.fetch,
  maxAttempts = defaultMaxAttempts,
  retryBaseDelayMs = defaultRetryBaseDelayMs,
  sleep = defaultSleep,
  token,
}: {
  baseUrl?: string;
  fetch?: typeof globalThis.fetch;
  maxAttempts?: number;
  retryBaseDelayMs?: number;
  sleep?: (delayMs: number) => Promise<void>;
  token?: string | undefined;
} = {}): VehicleCatalogProvider {
  const request = async <T>(path: string): Promise<T> => {
    const attempts = Math.max(1, maxAttempts);
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
        headers: token ? { "X-Subscription-Token": token } : {},
      });
      if (response.ok) return (await response.json()) as T;
      if (!shouldRetry(response.status) || attempt === attempts) {
        throw new FipeCatalogProviderError(response.status, path);
      }
      await sleep(getRetryDelayMs(response, attempt, retryBaseDelayMs));
    }
    throw new Error("FIPE catalog request exhausted retry attempts.");
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
  constructor(
    readonly status: number,
    readonly path: string,
  ) {
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
    priceCents: parseFipePriceCents(input.details.price),
    referenceMonth: input.details.referenceMonth,
    source: "fipe",
    vehicleType: input.vehicleType,
    yearCode: input.yearCode,
    yearName: String(input.details.modelYear),
  };
}

export function parseFipePriceCents(value: string): number | null {
  const normalized = value
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();
  if (!normalized) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}

function shouldRetry(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function getRetryDelayMs(
  response: Response,
  attempt: number,
  retryBaseDelayMs: number,
): number {
  return Math.min(
    readRetryAfterMs(response) ?? retryBaseDelayMs * 2 ** (attempt - 1),
    maxRetryDelayMs,
  );
}

function readRetryAfterMs(response: Response): number | null {
  const value = response.headers.get("retry-after");
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000;
  const dateMs = Date.parse(value);
  return Number.isFinite(dateMs) ? Math.max(0, dateMs - Date.now()) : null;
}

async function defaultSleep(delayMs: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}
