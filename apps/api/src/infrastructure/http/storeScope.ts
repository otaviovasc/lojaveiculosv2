import type { Context } from "hono";

const baseDomain = "lojaveiculos.com.br";

export function resolveStoreSlugFromHostHeader(
  hostHeader: string | null | undefined,
): string | null {
  if (!hostHeader) {
    return null;
  }

  const firstHost = hostHeader.split(",")[0];

  if (!firstHost) {
    return null;
  }

  const host = normalizeHost(firstHost.trim().toLowerCase());

  if (isLocalOrIpHost(host)) {
    return null;
  }

  if (host === baseDomain || host === "www." + baseDomain) {
    return null;
  }

  if (!host.endsWith(`.${baseDomain}`)) {
    return host;
  }

  const storeSlug = host.substring(0, host.length - baseDomain.length - 1);

  if (!storeSlug || storeSlug === "www") {
    return null;
  }

  return storeSlug.split(".")[0] ?? null;
}

function isLocalOrIpHost(host: string) {
  return (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(host) ||
    /^\[[0-9a-f:]+]$/i.test(host)
  );
}

function normalizeHost(host: string) {
  if (host.startsWith("[")) return host.replace(/\]:\d+$/, "]");
  const hasSingleColon = host.indexOf(":") === host.lastIndexOf(":");
  return hasSingleColon ? host.replace(/:\d+$/, "") : host;
}

export function resolveStoreSlugFromRequest(context: Context): string | null {
  const explicitStoreSlug = context.req.header("x-store-slug")?.trim();
  if (explicitStoreSlug) {
    return explicitStoreSlug.toLowerCase();
  }

  return resolveStoreSlugFromHostHeader(
    context.req.header("x-forwarded-host") ?? context.req.header("host"),
  );
}
