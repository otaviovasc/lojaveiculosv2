import { AppApiError } from "../../lib/apiErrors";
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
  | { kind: "not-found" }
  | { data: PublicStorefrontPageData; kind: "ready" };

export type LeadCaptureSnapshot = {
  error?: Error | null;
  isSubmitting: boolean;
  submittedLeadId?: string | null;
};

export type LeadCaptureState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { error: Error; kind: "error" }
  | { kind: "submitted"; leadId: string };

export function derivePublicStorefrontState(
  snapshot: PublicStorefrontSnapshot,
): PublicStorefrontState {
  if (snapshot.isLoading) return { kind: "loading" };

  if (snapshot.error) {
    if (
      snapshot.error instanceof AppApiError &&
      snapshot.error.status === 404
    ) {
      return { kind: "not-found" };
    }
    return { error: snapshot.error, kind: "error" };
  }

  if (!snapshot.data || snapshot.data.listings.length === 0) {
    return { data: snapshot.data ?? emptyStorefrontData, kind: "empty" };
  }

  return { data: snapshot.data, kind: "ready" };
}

export function deriveLeadCaptureState(
  snapshot: LeadCaptureSnapshot,
): LeadCaptureState {
  if (snapshot.isSubmitting) return { kind: "submitting" };
  if (snapshot.error) return { error: snapshot.error, kind: "error" };
  if (snapshot.submittedLeadId) {
    return { kind: "submitted", leadId: snapshot.submittedLeadId };
  }

  return { kind: "idle" };
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
