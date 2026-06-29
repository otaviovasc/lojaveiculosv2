import type { StorefrontCustomPage } from "@lojaveiculosv2/shared";

export function slugifyCustomPage(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function isValidCustomPageSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export function buildCustomPagePublicPath(
  page: Pick<StorefrontCustomPage, "slug">,
  storeSlug: string,
) {
  return `/${storeSlug}/p/${page.slug}`;
}

export function buildCustomPagePreviewPath(
  page: Pick<StorefrontCustomPage, "previewUrl" | "secretToken" | "slug">,
  storeSlug: string,
) {
  const token = page.secretToken ?? tokenFromPreviewUrl(page.previewUrl);
  return `${buildCustomPagePublicPath(page, storeSlug)}${
    token ? `?token=${encodeURIComponent(token)}` : ""
  }`;
}

export function createDuplicatePageSlug(
  sourceSlug: string,
  pages: readonly Pick<StorefrontCustomPage, "slug">[],
) {
  const base = slugifyCustomPage(`${sourceSlug}-copia`) || "pagina-copia";
  const used = new Set(pages.map((page) => page.slug));
  if (!used.has(base)) return base;

  for (let index = 2; index < 100; index += 1) {
    const candidate = `${base}-${index}`;
    if (!used.has(candidate)) return candidate;
  }

  return `${base}-${Date.now()}`;
}

function tokenFromPreviewUrl(previewUrl?: string | null) {
  if (!previewUrl) return null;
  try {
    const url = new URL(previewUrl, "https://local.invalid");
    return url.searchParams.get("token");
  } catch {
    return null;
  }
}
