import { BlockList, isIP } from "node:net";
import { UnsafeCrmRemoteMediaUrlError } from "../../domains/crm/ports/crmRemoteMediaFetcher.js";

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
  ["240.0.0.0", 4],
] as const) {
  blockedAddresses.addSubnet(network, prefix, "ipv4");
}
for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["::", 96],
  ["64:ff9b::", 96],
  ["2001::", 32],
  ["2001:2::", 48],
  ["2001:10::", 28],
  ["2001:20::", 28],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  blockedAddresses.addSubnet(network, prefix, "ipv6");
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

function isBlockedMappedIpv4(address: string) {
  const match = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  if (!match?.[1]) return false;
  return blockedAddresses.check(match[1], "ipv4");
}
