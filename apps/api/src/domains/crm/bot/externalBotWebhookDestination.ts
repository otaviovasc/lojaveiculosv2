import { isIP } from "node:net";

export function isPublicHttpsWebhookUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return false;
    const hostname = normalizeHostname(url.hostname);
    if (!hostname || isLocalHostname(hostname)) return false;
    return isIP(hostname) === 0 || isPublicInternetAddress(hostname);
  } catch {
    return false;
  }
}

export function isPublicInternetAddress(address: string): boolean {
  const normalized = normalizeHostname(address);
  const family = isIP(normalized);
  if (family === 4) return isPublicIpv4(normalized);
  if (family === 6) return isPublicIpv6(normalized);
  return false;
}

function isPublicIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => part < 0 || part > 255)) {
    return false;
  }
  const value =
    ((parts[0]! << 24) | (parts[1]! << 16) | (parts[2]! << 8) | parts[3]!) >>>
    0;
  return !blockedIpv4Ranges.some(([network, prefix]) =>
    isInIpv4Range(value, network, prefix),
  );
}

function isPublicIpv6(address: string) {
  const parts = parseIpv6(address);
  if (!parts) return false;

  const mappedIpv4 = ipv4MappedAddress(parts);
  if (mappedIpv4) return isPublicIpv4(mappedIpv4);

  // Public Internet IPv6 currently comes from the IANA global-unicast 2000::/3
  // block. Explicitly exclude special-use ranges within that block.
  if ((parts[0]! & 0xe000) !== 0x2000) return false;
  if (parts[0] === 0x2001 && (parts[1]! & 0xfe00) === 0) return false;
  if (parts[0] === 0x2001 && parts[1] === 0x0db8) return false;
  if (parts[0] === 0x2002) return false;
  if (parts[0] === 0x3fff && (parts[1]! & 0xf000) === 0) return false;
  return true;
}

function parseIpv6(address: string): number[] | null {
  const [leftText, rightText, extra] = address.toLowerCase().split("::");
  if (extra !== undefined) return null;
  const left = parseIpv6Side(leftText ?? "");
  const right = parseIpv6Side(rightText ?? "");
  if (!left || !right) return null;
  if (rightText === undefined) return left.length === 8 ? left : null;
  const missing = 8 - left.length - right.length;
  return missing >= 1
    ? [...left, ...Array.from({ length: missing }, () => 0), ...right]
    : null;
}

function parseIpv6Side(value: string): number[] | null {
  if (!value) return [];
  const result: number[] = [];
  for (const part of value.split(":")) {
    if (part.includes(".")) {
      const ipv4 = part.split(".").map(Number);
      if (
        ipv4.length !== 4 ||
        ipv4.some((item) => !Number.isInteger(item) || item < 0 || item > 255)
      ) {
        return null;
      }
      result.push(ipv4[0]! * 256 + ipv4[1]!, ipv4[2]! * 256 + ipv4[3]!);
      continue;
    }
    if (!/^[\da-f]{1,4}$/u.test(part)) return null;
    result.push(Number.parseInt(part, 16));
  }
  return result;
}

function ipv4MappedAddress(parts: readonly number[]) {
  if (parts.slice(0, 5).every((part) => part === 0) && parts[5] === 0xffff) {
    return `${parts[6]! >> 8}.${parts[6]! & 0xff}.${parts[7]! >> 8}.${parts[7]! & 0xff}`;
  }
  return null;
}

function normalizeHostname(value: string) {
  const unbracketed =
    value.startsWith("[") && value.endsWith("]") ? value.slice(1, -1) : value;
  return unbracketed.toLowerCase().replace(/\.$/u, "");
}

function isLocalHostname(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname === "home.arpa" ||
    hostname.endsWith(".home.arpa")
  );
}

function isInIpv4Range(value: number, network: number, prefix: number) {
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (value & mask) >>> 0 === (network & mask) >>> 0;
}

const blockedIpv4Ranges: readonly (readonly [number, number])[] = [
  [0x00000000, 8],
  [0x0a000000, 8],
  [0x64400000, 10],
  [0x7f000000, 8],
  [0xa9fe0000, 16],
  [0xac100000, 12],
  [0xc0000000, 24],
  [0xc0000200, 24],
  [0xc0586300, 24],
  [0xc0a80000, 16],
  [0xc6120000, 15],
  [0xc6336400, 24],
  [0xcb007100, 24],
  [0xe0000000, 4],
  [0xf0000000, 4],
];
