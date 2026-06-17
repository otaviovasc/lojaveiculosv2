import type { PublicStorefrontData } from "./types";

export const publicStorefrontPreview = {
  store: {
    id: "store_1",
    name: "Loja Demo Motors",
    slug: "demo",
    tenantId: "tenant_1",
  },
  listings: [
    {
      description: "Unico dono, revisoes em dia e pronta entrega.",
      listingId: "listing_1",
      manufactureYear: 2022,
      mileageKm: 32000,
      modelYear: 2023,
      priceCents: 12690000,
      slug: "fiat-toro-2023",
      status: "available",
      thumbnailUrl: null,
      title: "Fiat Toro Volcano 2023",
    },
    {
      description: "SUV completo com multimidia, camera e garantia.",
      listingId: "listing_2",
      manufactureYear: 2021,
      mileageKm: 41000,
      modelYear: 2022,
      priceCents: 9870000,
      slug: "jeep-renegade-2022",
      status: "available",
      thumbnailUrl: null,
      title: "Jeep Renegade Longitude 2022",
    },
    {
      description: "Hatch economico para giro rapido de estoque.",
      listingId: "listing_3",
      manufactureYear: 2020,
      mileageKm: 52000,
      modelYear: 2021,
      priceCents: 6850000,
      slug: "hyundai-hb20-2021",
      status: "available",
      thumbnailUrl: null,
      title: "Hyundai HB20 Comfort 2021",
    },
  ],
} satisfies PublicStorefrontData;
