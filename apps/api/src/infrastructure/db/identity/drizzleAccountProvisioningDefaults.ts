export function createPublicStorefrontDefaults(
  tenantId: string,
  storeId: string,
) {
  return {
    isPublished: true as const,
    storeId,
    tenantId,
  };
}
