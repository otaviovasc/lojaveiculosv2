import type { PublicStorefrontData } from "./types";

export type PublicStorefrontSnapshot = {
  data?: PublicStorefrontData | null;
  error?: Error | null;
  isLoading: boolean;
};

export type PublicStorefrontState =
  | { kind: "loading" }
  | { data: PublicStorefrontData; kind: "empty" }
  | { error: Error; kind: "error" }
  | { data: PublicStorefrontData; kind: "ready" };

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
  store: {
    id: "unknown",
    name: "Loja",
    slug: "loja",
    tenantId: "unknown",
  },
} satisfies PublicStorefrontData;
