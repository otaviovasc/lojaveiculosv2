/** Separator between SEO title and id for unambiguous parsing */
const SLUG_ID_SEP = "--";

export interface PropertySlugInput {
  id: string;
  title: string;
  neighborhood?: string | null;
  city?: string | null;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Build SEO-friendly property slug: slugified(title + neighborhood + city) + "--" + id
 * Example: "apartamento-2-quartos-leblon-rio-de-janeiro--clx1abc..."
 */
export function toPropertySlug(input: PropertySlugInput): string {
  const parts = [input.title, input.neighborhood, input.city].filter(
    (p) => p && String(p).trim(),
  );
  const semantic = slugify(parts.join(" ")) || "imovel";
  return `${semantic}${SLUG_ID_SEP}${input.id}`;
}

/**
 * Parse property slug to extract id. Handles both "title-slug--id" and legacy "id-only" formats.
 */
export function parsePropertySlug(param: string): string {
  const idx = param.lastIndexOf(SLUG_ID_SEP);
  if (idx >= 0) {
    const id = param.slice(idx + SLUG_ID_SEP.length);
    if (id) return id;
  }
  return param;
}

/** Build full storefront property URL: /{workspaceSlug}/imovel/{seo-slug} */
export function getPropertyUrl(
  workspaceSlug: string,
  property: PropertySlugInput,
): string {
  return `/${workspaceSlug}/imovel/${toPropertySlug(property)}`;
}
