import type { PublicStorefrontPageData } from "./types";

export type PublicStorefrontSnapshot = {
  data?: PublicStorefrontPageData | null;
  error?: Error | null;
  isLoading: boolean;
};

export type PublicStorefrontState =
  | { kind: "loading" }
  | { data: PublicStorefrontPageData; kind: "empty" }
  | { error: Error; kind: "error" }
  | { data: PublicStorefrontPageData; kind: "ready" };

export function derivePublicStorefrontState(
  snapshot: PublicStorefrontSnapshot,
): PublicStorefrontState {
  if (snapshot.isLoading) return { kind: "loading" };

  if (snapshot.error) {
    return { error: snapshot.error, kind: "error" };
  }

  if (!snapshot.data || snapshot.data.listings.length === 0) {
    return { data: snapshot.data ?? emptyStorefrontData, kind: "empty" };
  }

  return { data: snapshot.data, kind: "ready" };
}

const emptyStorefrontData = {
  listings: [],
  settings: {
    contact: {
      city: null,
      contactEmail: null,
      contactPhone: null,
      whatsappPhone: null,
      whatsappUrl: null,
    },
    site: {
      heroImageUrl: null,
      layoutKey: "default",
      seoDescription: null,
      seoTitle: null,
      theme: {},
    },
    store: {
      name: "Loja",
      publicUrl: "loja.lojaveiculos.com.br",
      slug: "loja",
    },
  },
  store: {
    name: "Loja",
    slug: "loja",
  },
} satisfies PublicStorefrontPageData;
