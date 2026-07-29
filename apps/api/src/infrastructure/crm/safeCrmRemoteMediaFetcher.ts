import { lookup as lookupDns } from "node:dns/promises";
import { request } from "node:https";
import { BlockList, isIP } from "node:net";
import type { LookupAddress } from "node:dns";
import type { IncomingHttpHeaders, IncomingMessage } from "node:http";
import {
  UnsafeCrmRemoteMediaUrlError,
  type CrmRemoteMediaFetcher,
} from "../../domains/crm/ports/crmRemoteMediaFetcher.js";

const MAX_REDIRECTS = 3;
const REQUEST_TIMEOUT_MS = 10_000;

const blockedAddresses = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
] as const) {
  blockedAddresses.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["64:ff9b::", 96],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  blockedAddresses.addSubnet(network, prefix, "ipv6");
}

export function createSafeCrmRemoteMediaFetcher(): CrmRemoteMediaFetcher {
  return {
    fetchMedia: ({ maxBytes, url }) =>
      fetchPublicHttpsMedia(url, maxBytes, MAX_REDIRECTS),
    validateUrl: async ({ url }) => {
      await resolvePublicHttpsTarget(url);
    },
  };
}

export function assertPublicRemoteAddress(address: string): void {
  const family = isIP(address);
  if (!family) throw new UnsafeCrmRemoteMediaUrlError();
  if (
    blockedAddresses.check(address, family === 4 ? "ipv4" : "ipv6") ||
    isBlockedMappedIpv4(address)
  ) {
    throw new UnsafeCrmRemoteMediaUrlError();
  }
}

export function parsePublicHttpsUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new UnsafeCrmRemoteMediaUrlError();
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    !url.hostname
  ) {
    throw new UnsafeCrmRemoteMediaUrlError();
  }
  if (isIP(url.hostname)) assertPublicRemoteAddress(url.hostname);
  return url;
}

async function fetchPublicHttpsMedia(
  value: string,
  maxBytes: number,
  redirectsRemaining: number,
): Promise<{
  body: Uint8Array;
  contentType: string | null;
  finalUrl: string;
}> {
  const { addresses, url } = await resolvePublicHttpsTarget(value);

  const response = await requestPinned(url, addresses[0]!);
  if (isRedirect(response.statusCode)) {
    if (!redirectsRemaining) throw new UnsafeCrmRemoteMediaUrlError();
    const location = firstHeader(response.headers.location);
    if (!location) throw new UnsafeCrmRemoteMediaUrlError();
    return fetchPublicHttpsMedia(
      new URL(location, url).toString(),
      maxBytes,
      redirectsRemaining - 1,
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
    body: await readLimitedBody(response.body, maxBytes),
    contentType: firstHeader(response.headers["content-type"]) ?? null,
    finalUrl: url.toString(),
  };
}

async function resolvePublicHttpsTarget(value: string) {
  const url = parsePublicHttpsUrl(value);
  let addresses: LookupAddress[];
  try {
    addresses = await lookupDns(url.hostname, {
      all: true,
      verbatim: true,
    });
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
        timeout: REQUEST_TIMEOUT_MS,
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
    pending.once("timeout", () => {
      pending.destroy(new RemoteMediaTimeoutError());
    });
    pending.end();
  });
}

async function readLimitedBody(
  stream: IncomingMessage,
  maxBytes: number,
): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  for await (const rawChunk of stream) {
    const chunk =
      rawChunk instanceof Uint8Array ? rawChunk : Buffer.from(String(rawChunk));
    totalBytes += chunk.byteLength;
    if (totalBytes > maxBytes) throw new RemoteMediaTooLargeError();
    chunks.push(chunk);
  }
  if (!totalBytes) throw new RemoteMediaEmptyBodyError();
  return Buffer.concat(chunks, totalBytes);
}

function isBlockedMappedIpv4(address: string) {
  const match = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  if (!match?.[1]) return false;
  return blockedAddresses.check(match[1], "ipv4");
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

class RemoteMediaTimeoutError extends Error {
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
