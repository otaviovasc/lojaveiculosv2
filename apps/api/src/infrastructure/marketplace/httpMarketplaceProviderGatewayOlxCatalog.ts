import type { MarketplaceCatalogSnapshot } from "../../domains/marketplace/ports/marketplaceRepository.js";
import type {
  MarketplaceProviderCatalogResolution,
  MarketplaceTokenSet,
} from "../../domains/marketplace/ports/marketplaceProviderGateway.js";
import type { HttpMarketplaceGatewayOptions } from "./httpMarketplaceProviderGatewayTypes.js";
import {
  fetchOlx,
  readBoundedOlxRecord,
} from "./httpMarketplaceProviderGatewayOlxRequest.js";
import {
  baseUrl,
  MarketplaceProviderGatewayError,
  providerHttpError,
} from "./httpMarketplaceProviderGatewaySupport.js";

type OlxCatalogEntry = { code: string; name: string };

export async function resolveOlxCatalogMapping(
  fetchImpl: typeof fetch,
  options: HttpMarketplaceGatewayOptions,
  input: { catalog: MarketplaceCatalogSnapshot; token: MarketplaceTokenSet },
): Promise<MarketplaceProviderCatalogResolution> {
  const catalogPath = providerCatalogPath(input.catalog.vehicleType);
  if (!catalogPath || !input.catalog.brandName || !input.catalog.modelName) {
    return unresolved("unsupported_or_incomplete_catalog");
  }

  const brands = await readCatalogEntries(
    fetchImpl,
    options,
    input.token.accessToken,
    catalogPath,
  );
  const brand = exactEntry(brands, input.catalog.brandName);
  if (!brand) return unresolved("provider_brand_not_found");

  const models = await readCatalogEntries(
    fetchImpl,
    options,
    input.token.accessToken,
    `${catalogPath}/${encodeURIComponent(brand.code)}`,
  );
  const model = modelEntry(models, input.catalog.modelName);
  if (!model) return unresolved("provider_model_not_found");

  const versions = await readCatalogEntries(
    fetchImpl,
    options,
    input.token.accessToken,
    `${catalogPath}/${encodeURIComponent(brand.code)}/${encodeURIComponent(model.code)}`,
  );
  const version = versionEntry(versions, input.catalog.modelName, model.name);
  if (!version) return unresolved("provider_version_not_found");

  return {
    providerBrandCode: brand.code,
    providerModelCode: model.code,
    providerTrimCode: version.code,
    providerYearCode: null,
    status: "resolved",
    unresolvedReason: null,
  };
}

async function readCatalogEntries(
  fetchImpl: typeof fetch,
  options: HttpMarketplaceGatewayOptions,
  accessToken: string,
  path: string,
): Promise<OlxCatalogEntry[]> {
  const response = await fetchOlx(fetchImpl, `${baseUrl(options)}${path}`, {
    body: JSON.stringify({ access_token: accessToken }),
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0",
    },
    method: "POST",
  });
  const payload = await readBoundedOlxRecord(response);
  if (!response.ok) throw providerHttpError("olx", response, payload);
  if (payload.status !== "ok" || !isRecord(payload.data)) {
    throw new MarketplaceProviderGatewayError(
      "MARKETPLACE_PROVIDER_UNAVAILABLE",
      "Marketplace provider returned an invalid catalog response.",
      "olx",
      502,
      { provider: "olx" },
    );
  }
  return Object.entries(payload.data).flatMap(([name, code]) => {
    const normalizedCode =
      typeof code === "number" || typeof code === "string"
        ? String(code).trim()
        : "";
    return normalizedCode ? [{ code: normalizedCode, name }] : [];
  });
}

function providerCatalogPath(
  vehicleType: MarketplaceCatalogSnapshot["vehicleType"],
) {
  if (vehicleType === "cars") return "/autoupload/car_info";
  if (vehicleType === "motorcycles") return "/autoupload/moto_info";
  return null;
}

function exactEntry(entries: OlxCatalogEntry[], target: string) {
  const normalizedTarget = compactName(target);
  return entries.find((entry) => compactName(entry.name) === normalizedTarget);
}

function modelEntry(entries: OlxCatalogEntry[], target: string) {
  const normalizedTarget = compactName(target);
  return [...entries]
    .filter((entry) => {
      const normalizedEntry = compactName(entry.name);
      return (
        normalizedTarget === normalizedEntry ||
        (normalizedTarget.startsWith(normalizedEntry) &&
          isNameTokenPrefix(target, entry.name))
      );
    })
    .sort(
      (left, right) =>
        compactName(right.name).length - compactName(left.name).length,
    )[0];
}

function isNameTokenPrefix(target: string, prefix: string) {
  const targetWords = nameWords(target);
  const prefixWords = nameWords(prefix);
  return (
    prefixWords.length < targetWords.length &&
    prefixWords.every((word, index) => word === targetWords[index])
  );
}

function versionEntry(
  entries: OlxCatalogEntry[],
  target: string,
  providerModelName: string,
) {
  const normalizedTarget = compactName(target);
  const normalizedModel = compactName(providerModelName);
  const acceptedNames = new Set([normalizedTarget]);
  if (normalizedTarget.startsWith(normalizedModel)) {
    const versionOnlyName = normalizedTarget.slice(normalizedModel.length);
    if (versionOnlyName) acceptedNames.add(versionOnlyName);
  }
  const matches = entries.filter((entry) =>
    acceptedNames.has(compactName(entry.name)),
  );
  return matches.length === 1 ? matches[0] : undefined;
}

function nameWords(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .toUpperCase()
    .split(/\s+/)
    .filter(Boolean);
}

function compactName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();
}

function unresolved(reason: string): MarketplaceProviderCatalogResolution {
  return {
    providerBrandCode: null,
    providerModelCode: null,
    providerTrimCode: null,
    providerYearCode: null,
    status: "unresolved",
    unresolvedReason: reason,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
