import {
  FiscalArtifactUnavailableError,
  type FiscalArtifactFormat,
  type FiscalProviderArtifact,
} from "../../domains/fiscal/ports/fiscalProviderGateway.js";
import {
  SpedyGatewayConfigurationError,
  SpedyGatewayHttpError,
} from "./spedyErrors.js";

type Fetcher = typeof fetch;

const maxFiscalArtifactBytes = 25 * 1024 * 1024;

export async function requestSpedyFiscalArtifact(input: {
  apiKey: string;
  baseUrl: string;
  fetcher: Fetcher;
  format: FiscalArtifactFormat;
  path: string;
}): Promise<FiscalProviderArtifact> {
  const url = trustedSpedyArtifactUrl(input.baseUrl, input.path);
  let response: Response;
  try {
    response = await input.fetcher(url, {
      headers: { "X-Api-Key": input.apiKey },
      method: "GET",
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new SpedyGatewayHttpError(
      "Spedy fiscal artifact request failed.",
      503,
    );
  }
  if (!response.ok) {
    if ([404, 409, 422].includes(response.status)) {
      throw new FiscalArtifactUnavailableError(input.format);
    }
    throw new SpedyGatewayHttpError(
      `Spedy fiscal artifact request failed with HTTP ${response.status}.`,
      response.status,
    );
  }
  const declaredLength = Number(response.headers.get("content-length"));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > maxFiscalArtifactBytes
  ) {
    await cancelResponseBody(response);
    throw new FiscalArtifactUnavailableError(input.format);
  }
  const bytes = await readBoundedArtifactBody(response, input.format);
  if (
    bytes.byteLength === 0 ||
    !hasExpectedArtifactSignature(bytes, input.format)
  ) {
    throw new FiscalArtifactUnavailableError(input.format);
  }
  return {
    bytes,
    contentType: input.format === "pdf" ? "application/pdf" : "application/xml",
  };
}

function trustedSpedyArtifactUrl(baseUrl: string, path: string) {
  let trustedOrigin: URL;
  let artifactUrl: URL;
  try {
    trustedOrigin = new URL(baseUrl);
    artifactUrl = new URL(
      path,
      baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`,
    );
  } catch {
    throw new SpedyGatewayConfigurationError(["SPEDY_API_URL"]);
  }
  if (
    trustedOrigin.protocol !== "https:" ||
    trustedOrigin.username ||
    trustedOrigin.password ||
    artifactUrl.protocol !== "https:" ||
    artifactUrl.origin !== trustedOrigin.origin ||
    artifactUrl.username ||
    artifactUrl.password
  ) {
    throw new SpedyGatewayConfigurationError(["SPEDY_API_URL=https"]);
  }
  return artifactUrl.href;
}

async function readBoundedArtifactBody(
  response: Response,
  format: FiscalArtifactFormat,
) {
  if (!response.body) throw new FiscalArtifactUnavailableError(format);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      totalBytes += result.value.byteLength;
      if (totalBytes > maxFiscalArtifactBytes) {
        await cancelReader(reader);
        throw new FiscalArtifactUnavailableError(format);
      }
      chunks.push(result.value);
    }
  } catch (error) {
    if (error instanceof FiscalArtifactUnavailableError) throw error;
    await cancelReader(reader);
    throw new SpedyGatewayHttpError(
      "Spedy fiscal artifact response could not be read.",
      503,
    );
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function cancelResponseBody(response: Response) {
  try {
    await response.body?.cancel();
  } catch {
    // The artifact is rejected regardless of provider stream cleanup failure.
  }
}

async function cancelReader(
  reader: ReadableStreamDefaultReader<Uint8Array<ArrayBuffer>>,
) {
  try {
    await reader.cancel();
  } catch {
    // Preserve the bounded-read error when provider stream cleanup also fails.
  }
}

function hasExpectedArtifactSignature(
  bytes: Uint8Array,
  format: FiscalArtifactFormat,
) {
  if (format === "pdf") {
    return new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
  }
  let offset =
    bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? 3 : 0;
  while (offset < bytes.length && isXmlWhitespace(bytes[offset])) offset += 1;
  return bytes[offset] === 0x3c;
}

function isXmlWhitespace(value: number | undefined) {
  return value === 0x09 || value === 0x0a || value === 0x0d || value === 0x20;
}
