export const pageBuilderDefaultMedia = {
  showroom: "/images/storefront/about-showroom.webp",
  storefront: "/images/storefront/about-store.webp",
  vehiclePending: "/images/storefront/vehicle-photo-pending.webp",
} as const;

export const pageBuilderDefaultGalleryImages = [
  {
    alt: "Fachada da loja",
    caption: "Nossa loja",
    id: "gallery-default-storefront",
    url: pageBuilderDefaultMedia.storefront,
  },
  {
    alt: "Showroom da loja",
    caption: "Showroom",
    id: "gallery-default-showroom",
    url: pageBuilderDefaultMedia.showroom,
  },
  {
    alt: "Veículo em preparação",
    caption: "Estoque em preparação",
    id: "gallery-default-vehicle-pending",
    url: pageBuilderDefaultMedia.vehiclePending,
  },
] as const;
