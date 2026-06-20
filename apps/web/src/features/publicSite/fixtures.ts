import type { PublicStorefrontPageData } from "./types";

export const publicStorefrontPreview = {
  settings: {
    contact: {
      city: "Sao Paulo",
      contactEmail: "contato@demo.com.br",
      contactPhone: null,
      whatsappPhone: "5511999999999",
      whatsappUrl: "https://wa.me/5511999999999",
    },
    site: {
      heroImageUrl: "https://cdn.local/hero.jpg",
      layoutKey: "default",
      seoDescription: "Estoque revisado com atendimento direto pelo WhatsApp.",
      seoTitle: "Loja Demo Motors",
      theme: {},
    },
    store: {
      name: "Loja Demo Motors",
      publicUrl: "demo.lojaveiculos.com.br",
      slug: "demo",
    },
  },
  store: {
    name: "Loja Demo Motors",
    slug: "demo",
  },
  listings: [
    {
      description: "Unico dono, revisoes em dia e pronta entrega.",
      manufactureYear: 2022,
      mileageKm: 32000,
      modelYear: 2023,
      priceCents: 12690000,
      slug: "fiat-toro-2023",
      status: "available",
      thumbnailUrl: "https://cdn.local/front.jpg",
      title: "Fiat Toro Volcano 2023",
    },
    {
      description: "SUV completo com multimidia, camera e garantia.",
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
} satisfies PublicStorefrontPageData;
