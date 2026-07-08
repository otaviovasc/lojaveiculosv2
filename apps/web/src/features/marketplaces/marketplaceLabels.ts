import type { MarketplaceProvider } from "./types";

export const providerLabels: Record<MarketplaceProvider, string> = {
  mercado_livre: "Mercado Livre",
  olx: "OLX",
};

export const jobLabels: Record<string, string> = {
  listing_publish: "Publicar anuncio",
  listing_unpublish: "Remover anuncio",
  listing_update: "Atualizar anuncio",
};
