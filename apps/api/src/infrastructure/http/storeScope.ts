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

  const host = firstHost.trim().toLowerCase().replace(/:\d+$/, "");

  if (host === baseDomain || host === "www." + baseDomain) {
    return null;
  }

  if (!host.endsWith(`.${baseDomain}`)) {
    return null;
  }

  const storeSlug = host.substring(0, host.length - baseDomain.length - 1);

  if (!storeSlug || storeSlug === "www") {
    return null;
  }

  return storeSlug.split(".")[0] ?? null;
}

export function resolveStoreSlugFromRequest(context: Context): string | null {
  return resolveStoreSlugFromHostHeader(
    context.req.header("x-forwarded-host") ?? context.req.header("host"),
  );
}
