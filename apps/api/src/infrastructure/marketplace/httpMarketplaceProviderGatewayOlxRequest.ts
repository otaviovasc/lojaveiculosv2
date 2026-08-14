import { MarketplaceProviderGatewayError } from "./httpMarketplaceProviderGatewaySupport.js";

const MAX_RESPONSE_BYTES = 64 * 1_024;
const REQUEST_TIMEOUT_MS = 15_000;

export async function fetchOlx(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
) {
  try {
    return await fetchImpl(url, {
      ...init,
      redirect: "error",
      signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof MarketplaceProviderGatewayError) throw error;
    throw unavailable();
  }
}

export async function readBoundedOlxRecord(response: Response) {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESPONSE_BYTES) {
    throw unavailable();
  }
  if (!response.body) return {};
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.byteLength;
    if (size > MAX_RESPONSE_BYTES) {
      await reader.cancel().catch(() => undefined);
      throw unavailable();
    }
    chunks.push(part.value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(body));
    return isRecord(value) ? value : {};
  } catch {
    return {};
  }
}

function unavailable() {
  return new MarketplaceProviderGatewayError(
    "MARKETPLACE_PROVIDER_UNAVAILABLE",
    "Marketplace provider is unavailable.",
    "olx",
    503,
    { provider: "olx" },
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
