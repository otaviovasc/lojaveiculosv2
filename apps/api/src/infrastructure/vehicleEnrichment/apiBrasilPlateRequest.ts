import { InventoryEnrichmentProviderError } from "./inventoryEnrichmentProviderError.js";

export async function requestApiBrasilPlatePayload({
  body,
  fetch,
  token,
  url,
}: {
  body: Record<string, unknown>;
  fetch: typeof globalThis.fetch;
  token: string;
  url: string;
}): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      body: JSON.stringify(body),
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });
  } catch {
    throw new InventoryEnrichmentProviderError(
      "Plate lookup provider request failed.",
      503,
    );
  }
  if (!response.ok) {
    throw new InventoryEnrichmentProviderError(
      `Plate lookup failed with status ${response.status}.`,
      response.status === 401 || response.status === 403 ? 502 : 503,
    );
  }
  const payload = (await response.json()) as unknown;
  const providerError = readProviderError(payload);
  if (providerError) {
    throw new InventoryEnrichmentProviderError(providerError, 502);
  }
  return payload;
}

function readProviderError(payload: unknown) {
  if (!isRecord(payload) || payload.error !== true) return null;
  return typeof payload.message === "string" && payload.message.trim()
    ? payload.message.trim()
    : "Plate lookup failed.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
