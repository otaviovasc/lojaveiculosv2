export function sanitizeMarketplaceMetadata(metadata: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(metadata).filter(
      ([key]) =>
        ![
          "accessToken",
          "operationToken",
          "providerOperationToken",
          "refreshToken",
        ].includes(key),
    ),
  );
}
