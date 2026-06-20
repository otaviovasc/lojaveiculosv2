import { RefreshCcw, SearchX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  createPublicStorefrontApi,
  type PublicStorefrontApi,
} from "./apiClient";
import type { PublicListingDetailSnapshot } from "./PublicListingDetailPanel";
import { PublicStorefront } from "./PublicStorefront";
import {
  derivePublicStorefrontState,
  type PublicStorefrontSnapshot,
} from "./state";
import {
  applyPublicStorefrontMetadata,
  StorefrontStateFrame,
} from "./PublicStorefrontPageSupport";

export function PublicStorefrontPage({ api }: { api?: PublicStorefrontApi }) {
  const storefrontApi = useMemo(
    () => api ?? createPublicStorefrontApi(createPublicStorefrontApiOptions()),
    [api],
  );
  const [retryKey, setRetryKey] = useState(0);
  const [detailRetryKey, setDetailRetryKey] = useState(0);
  const [snapshot, setSnapshot] = useState<PublicStorefrontSnapshot>({
    isLoading: true,
  });
  const [detailSnapshot, setDetailSnapshot] =
    useState<PublicListingDetailSnapshot>({
      isLoading: false,
      listingSlug: null,
    });

  useEffect(() => {
    let isActive = true;
    setSnapshot({ isLoading: true });

    storefrontApi
      .getSettings()
      .then((settings) =>
        storefrontApi
          .listListings({ limit: 12 })
          .then((data) => ({ ...data, settings })),
      )
      .then((data) => {
        if (isActive) setSnapshot({ data, isLoading: false });
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        setSnapshot({
          error: error instanceof Error ? error : new Error(String(error)),
          isLoading: false,
        });
      });

    return () => {
      isActive = false;
    };
  }, [retryKey, storefrontApi]);

  useEffect(() => {
    if (!detailSnapshot.listingSlug) return;

    let isActive = true;
    const listingSlug = detailSnapshot.listingSlug;
    setDetailSnapshot({ isLoading: true, listingSlug });

    storefrontApi
      .getListing(listingSlug)
      .then((data) => {
        if (isActive)
          setDetailSnapshot({ data, isLoading: false, listingSlug });
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        setDetailSnapshot({
          error: error instanceof Error ? error : new Error(String(error)),
          isLoading: false,
          listingSlug,
        });
      });

    return () => {
      isActive = false;
    };
  }, [detailRetryKey, detailSnapshot.listingSlug, storefrontApi]);

  const state = derivePublicStorefrontState(snapshot);

  useEffect(() => {
    if (state.kind !== "ready" && state.kind !== "empty") return;
    return applyPublicStorefrontMetadata(state.data);
  }, [state]);

  if (state.kind === "ready") {
    return (
      <PublicStorefront
        data={state.data}
        detail={detailSnapshot}
        onCloseListing={() =>
          setDetailSnapshot({ isLoading: false, listingSlug: null })
        }
        onOpenListing={(listingSlug) =>
          setDetailSnapshot({ isLoading: true, listingSlug })
        }
        onRetryListing={() => setDetailRetryKey((current) => current + 1)}
        onSubmitListingInterest={(listingSlug, input) =>
          storefrontApi.submitListingInterest(listingSlug, input)
        }
      />
    );
  }

  if (state.kind === "empty") {
    return (
      <StorefrontStateFrame
        icon={<SearchX aria-hidden="true" className="size-6" />}
        title="Estoque indisponivel"
      />
    );
  }

  if (state.kind === "error") {
    return (
      <StorefrontStateFrame
        action={
          <button
            className="mt-5 flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-4 font-black text-inverse"
            onClick={() => setRetryKey((current) => current + 1)}
            type="button"
          >
            <RefreshCcw aria-hidden="true" className="size-4" />
            Tentar novamente
          </button>
        }
        icon={<RefreshCcw aria-hidden="true" className="size-6" />}
        title="Vitrine temporariamente indisponivel"
      />
    );
  }

  return (
    <StorefrontStateFrame
      icon={<RefreshCcw aria-hidden="true" className="size-6 animate-spin" />}
      title="Carregando estoque"
    />
  );
}

function createPublicStorefrontApiOptions() {
  const baseUrl = getPublicStorefrontApiBaseUrl();

  return {
    ...(baseUrl ? { baseUrl } : {}),
    fetch: window.fetch.bind(window),
  };
}

function getPublicStorefrontApiBaseUrl() {
  const env = import.meta.env as unknown as {
    VITE_API_BASE_URL?: string;
  };

  return env.VITE_API_BASE_URL;
}
