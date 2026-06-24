import type {
  VehicleCatalogProvider,
  VehicleCatalogType,
} from "../../domains/vehicle/ports/vehicleCatalogProvider.js";
import {
  type FipeOption,
  type FipeReference,
  type FipeVehicleDetails,
  parseFipePriceCents,
  toBrandOption,
  toCatalogSnapshot,
  toFipeCodeDetails,
  toOption,
  toPriceHistory,
  toReference,
  toYearOption,
} from "./fipeVehicleCatalogMapping.js";
import {
  createFipeRawResponseCapture,
  type FipeRawResponseRecorder,
} from "./fipeVehicleCatalogRaw.js";
import { resolveVehicleBrandLogoUrl } from "./vehicleBrandLogoResolver.js";

const defaultBaseUrl = "https://parallelum.com.br/fipe/api/v2";
const defaultMaxAttempts = 5;
const defaultRequestTimeoutMs = 30_000;
const defaultRetryBaseDelayMs = 1_000;
const maxRetryDelayMs = 60_000;
type BrandLogoUrlResolver = (brandName: string) => string | null;

export function createFipeVehicleCatalogProvider({
  baseUrl = defaultBaseUrl,
  brandLogoUrlResolver = resolveVehicleBrandLogoUrl,
  fetch = globalThis.fetch,
  maxAttempts = defaultMaxAttempts,
  rawResponseRecorder,
  requestTimeoutMs = defaultRequestTimeoutMs,
  retryBaseDelayMs = defaultRetryBaseDelayMs,
  sleep = defaultSleep,
  token,
}: {
  baseUrl?: string;
  brandLogoUrlResolver?: BrandLogoUrlResolver;
  fetch?: typeof globalThis.fetch;
  maxAttempts?: number;
  rawResponseRecorder?: FipeRawResponseRecorder | undefined;
  requestTimeoutMs?: number;
  retryBaseDelayMs?: number;
  sleep?: (delayMs: number) => Promise<void>;
  token?: string | undefined;
} = {}): VehicleCatalogProvider {
  const request = async <T>(path: string): Promise<T> => {
    const attempts = Math.max(1, maxAttempts);
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      let response: Response;
      try {
        response = await fetchWithTimeout(
          fetch,
          `${baseUrl.replace(/\/$/, "")}${path}`,
          { headers: token ? { "X-Subscription-Token": token } : {} },
          requestTimeoutMs,
        );
      } catch (error) {
        if (attempt === attempts) {
          throw new FipeCatalogProviderError(0, path, error);
        }
        await sleep(getAttemptDelayMs(attempt, retryBaseDelayMs));
        continue;
      }
      if (response.ok) {
        const payload = (await response.json()) as T;
        await rawResponseRecorder?.(
          createFipeRawResponseCapture({
            path,
            payload,
            status: response.status,
          }),
        );
        return payload;
      }
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
        withReference(
          `/${input.vehicleType}/brands/${input.brandCode}/models/${input.modelCode}/years/${input.yearCode}`,
          input.referenceCode,
        ),
      );
      return toCatalogSnapshot({ ...input, details });
    },
    getVehicleByFipeCode: async (input) => {
      const details = await request<FipeVehicleDetails>(
        withReference(
          `/${input.vehicleType}/${input.fipeCode}/years/${input.yearCode}`,
          input.referenceCode,
        ),
      );
      return toFipeCodeDetails({ ...input, details });
    },
    getVehicleHistory: async (input) => {
      const details = await request<FipeVehicleDetails>(
        withReference(
          `/${input.vehicleType}/${input.fipeCode}/years/${input.yearCode}/history`,
          input.referenceCode,
        ),
      );
      return toPriceHistory({ ...input, details });
    },
    listBrands: async ({ referenceCode, vehicleType }) =>
      (
        await request<FipeOption[]>(
          withReference(`/${vehicleType}/brands`, referenceCode),
        )
      ).map((brand) => toBrandOption(brand, brandLogoUrlResolver)),
    listModels: async ({ brandCode, referenceCode, vehicleType }) =>
      (
        await request<FipeOption[]>(
          withReference(
            `/${vehicleType}/brands/${brandCode}/models`,
            referenceCode,
          ),
        )
      ).map((model) => toOption(model)),
    listReferences: async () =>
      (await request<FipeReference[]>("/references")).map(toReference),
    listYears: async ({ brandCode, modelCode, referenceCode, vehicleType }) =>
      (
        await request<FipeOption[]>(
          withReference(
            `/${vehicleType}/brands/${brandCode}/models/${modelCode}/years`,
            referenceCode,
          ),
        )
      ).map(toYearOption),
    listYearsByFipeCode: async ({ fipeCode, referenceCode, vehicleType }) =>
      (
        await request<FipeOption[]>(
          withReference(`/${vehicleType}/${fipeCode}/years`, referenceCode),
        )
      ).map(toYearOption),
  };
}

function withReference(
  path: string,
  referenceCode: string | undefined,
): string {
  return referenceCode
    ? `${path}?reference=${encodeURIComponent(referenceCode)}`
    : path;
}

async function fetchWithTimeout(
  fetch: typeof globalThis.fetch,
  url: string,
  init: RequestInit,
  requestTimeoutMs: number,
): Promise<Response> {
  if (requestTimeoutMs <= 0) return fetch(url, init);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export class FipeCatalogProviderError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    cause?: unknown,
  ) {
    super(createFipeCatalogProviderErrorMessage(status, path, cause));
    this.name = "FipeCatalogProviderError";
  }
}

function shouldRetry(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function getAttemptDelayMs(attempt: number, retryBaseDelayMs: number): number {
  return Math.min(retryBaseDelayMs * 2 ** (attempt - 1), maxRetryDelayMs);
}

function getRetryDelayMs(
  response: Response,
  attempt: number,
  retryBaseDelayMs: number,
): number {
  return Math.min(
    readRetryAfterMs(response) ?? getAttemptDelayMs(attempt, retryBaseDelayMs),
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

function createFipeCatalogProviderErrorMessage(
  status: number,
  path: string,
  cause: unknown,
): string {
  if (status > 0)
    return `FIPE catalog request failed with status ${status}: ${path}`;
  const causeMessage = cause instanceof Error ? `: ${cause.message}` : "";
  return `FIPE catalog request failed before receiving a response: ${path}${causeMessage}`;
}

export { parseFipePriceCents };
