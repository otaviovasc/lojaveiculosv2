export function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
  headers: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json",
      "x-request-id": "provider_req_1",
      ...headers,
    },
    status,
  });
}

export function tokenSet() {
  return {
    accessToken: "token_1",
    expiresAt: null,
    providerAccountId: null,
    refreshToken: null,
    scope: null,
    tokenType: "Bearer",
  };
}

export function listingProjection() {
  return {
    catalog: {
      brandCode: "21",
      brandName: "BMW",
      fipeCode: "001267-0",
      fuel: "Gasolina",
      modelCode: "4828",
      modelName: "M3 Competition M",
      modelYear: 2024,
      referenceMonth: "julho de 2026",
      source: "fipe" as const,
      vehicleType: "cars" as const,
      yearCode: "2024-1",
      yearName: "2024 Gasolina",
    },
    description: "Descricao",
    doors: 4,
    fuelType: "gasoline" as const,
    isVisibleOnPublicSite: true,
    listingId: "listing_1",
    mediaUrls: ["https://cdn.example.test/photo.jpg"],
    mileageKm: 12000,
    modelYear: 2024,
    priceCents: 12000000,
    publicSlug: "bmw-m3",
    selectedMedia: [
      { altText: "Frente", url: "https://cdn.example.test/photo.jpg" },
    ],
    selectedUnitId: "unit_1",
    status: "published" as const,
    stockLabel: "LV-001",
    title: "BMW M3",
    trimName: "Competition M",
    vehicleType: "cars" as const,
  };
}
