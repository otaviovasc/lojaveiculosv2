import { DEFAULT_PUBLIC_STOREFRONT_THEME } from "@lojaveiculosv2/shared";

export function createPublicStorefrontDefaults(
  tenantId: string,
  storeId: string,
) {
  return {
    isPublished: true as const,
    layoutKey: "quadra",
    storeId,
    tenantId,
    theme: structuredClone(DEFAULT_PUBLIC_STOREFRONT_THEME),
  };
}
