import { lookup as lookupDns } from "node:dns/promises";
import { request } from "node:https";
import type { LookupAddress } from "node:dns";
import type { IncomingHttpHeaders, IncomingMessage } from "node:http";
import {
  UnsafeCrmRemoteMediaUrlError,
  type CrmRemoteMediaFetcher,
} from "../../domains/crm/ports/crmRemoteMediaFetcher.js";
import {
  assertPublicRemoteAddress,
  parsePublicHttpsUrl,
} from "./safeCrmRemoteMediaAddress.js";
export {
  assertPublicRemoteAddress,
  parsePublicHttpsUrl,
} from "./safeCrmRemoteMediaAddress.js";

const MAX_REDIRECTS = 3;
const REQUEST_TIMEOUT_MS = 10_000;

export function createSafeCrmRemoteMediaFetcher(): CrmRemoteMediaFetcher {
  return {
    fetchMedia: ({ maxBytes, url }) =>
      runWithCrmRemoteMediaTimeout((signal) =>
        fetchPublicHttpsMedia(url, maxBytes, MAX_REDIRECTS, signal),
      ),
    validateUrl: ({ url }) =>
      runWithCrmRemoteMediaTimeout(async (signal) => {
        await resolvePublicHttpsTarget(url, signal);
      }),
  };
}

export async function runWithCrmRemoteMediaTimeout<T>(
  action: (signal: AbortSignal) => Promise<T>,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(new RemoteMediaTimeoutError()),
    timeoutMs,
  );
  timeout.unref?.();
  try {
    return await action(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) throw new RemoteMediaTimeoutError();
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchPublicHttpsMedia(
  value: string,
  maxBytes: number,
  redirectsRemaining: number,
  signal: AbortSignal,
): Promise<{
  body: Uint8Array;
  contentType: string | null;
  finalUrl: string;
}> {
  const { addresses, url } = await resolvePublicHttpsTarget(value, signal);

  const response = await requestPinned(url, addresses[0]!, signal);
  if (isRedirect(response.statusCode)) {
    if (!redirectsRemaining) throw new UnsafeCrmRemoteMediaUrlError();
    const location = firstHeader(response.headers.location);
    if (!location) throw new UnsafeCrmRemoteMediaUrlError();
    return fetchPublicHttpsMedia(
      new URL(location, url).toString(),
      maxBytes,
      redirectsRemaining - 1,
      signal,
    );
  }
  if (response.statusCode < 200 || response.statusCode >= 300) {
    response.body.resume();
    throw new RemoteMediaFetchError(response.statusCode);
  }
  const declaredSize = readHeaderNumber(response.headers, "content-length");
  if (declaredSize !== null && declaredSize > maxBytes) {
    response.body.resume();
    throw new RemoteMediaTooLargeError();
  }
  return {
    body: await readLimitedBody(response.body, maxBytes, signal),
    contentType: firstHeader(response.headers["content-type"]) ?? null,
    finalUrl: url.toString(),
  };
}

async function resolvePublicHttpsTarget(value: string, signal: AbortSignal) {
  const url = parsePublicHttpsUrl(value);
  let addresses: LookupAddress[];
  try {
    addresses = await rejectWhenAborted(
      lookupDns(url.hostname, {
        all: true,
        verbatim: true,
      }),
      signal,
    );
  } catch {
    throw new UnsafeCrmRemoteMediaUrlError();
  }
  if (!addresses.length) throw new UnsafeCrmRemoteMediaUrlError();
  for (const address of addresses) assertPublicRemoteAddress(address.address);
  return { addresses, url };
}

function requestPinned(
  url: URL,
  address: LookupAddress,
  signal: AbortSignal,
): Promise<{
  body: IncomingMessage;
  headers: IncomingHttpHeaders;
  statusCode: number;
}> {
  return new Promise((resolve, reject) => {
    const pending = request(
      url,
      {
        headers: { Accept: "*/*" },
        lookup: (_hostname, _options, callback) =>
          callback(null, address.address, address.family),
        method: "GET",
        signal,
      },
      (response) => {
        const statusCode = response.statusCode ?? 0;
        if (isRedirect(statusCode)) {
          response.resume();
        }
        resolve({ body: response, headers: response.headers, statusCode });
      },
    );
    pending.once("error", reject);
    pending.end();
  });
}

function rejectWhenAborted<T>(promise: Promise<T>, signal: AbortSignal) {
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
  });
}

async function readLimitedBody(
  stream: IncomingMessage,
  maxBytes: number,
  signal: AbortSignal,
): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  const abort = () => stream.destroy(signal.reason);
  signal.addEventListener("abort", abort, { once: true });
  try {
    for await (const rawChunk of stream) {
      const chunk =
        rawChunk instanceof Uint8Array
          ? rawChunk
          : Buffer.from(String(rawChunk));
      totalBytes += chunk.byteLength;
      if (totalBytes > maxBytes) throw new RemoteMediaTooLargeError();
      chunks.push(chunk);
    }
  } finally {
    signal.removeEventListener("abort", abort);
  }
  if (!totalBytes) throw new RemoteMediaEmptyBodyError();
  return Buffer.concat(chunks, totalBytes);
}

function isRedirect(statusCode: number) {
  return [301, 302, 303, 307, 308].includes(statusCode);
}

function firstHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function readHeaderNumber(headers: IncomingHttpHeaders, name: string) {
  const value = firstHeader(headers[name]);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

class RemoteMediaFetchError extends Error {
  constructor(statusCode: number) {
    super(`Remote media fetch failed with status ${statusCode}.`);
    this.name = "RemoteMediaFetchError";
  }
}

export class RemoteMediaTimeoutError extends Error {
  constructor() {
    super("Remote media fetch timed out.");
    this.name = "RemoteMediaTimeoutError";
  }
}

class RemoteMediaTooLargeError extends Error {
  constructor() {
    super("Remote media exceeds the configured byte limit.");
    this.name = "RemoteMediaTooLargeError";
  }
}

class RemoteMediaEmptyBodyError extends Error {
  constructor() {
    super("Remote media returned an empty body.");
    this.name = "RemoteMediaEmptyBodyError";
  }
}
