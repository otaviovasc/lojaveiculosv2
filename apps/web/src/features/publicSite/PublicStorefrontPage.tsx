import { RefreshCcw, SearchX } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
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
import {
  applyWebsiteBuilderPreviewToStorefrontData,
  mergeWebsiteBuilderPreviewPayload,
  type WebsiteBuilderPreviewConfig,
} from "./publicStorefrontPreviewBridge";

export function PublicStorefrontPage({ api }: { api?: PublicStorefrontApi }) {
  const { storeSlug } = useParams<{ storeSlug?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const isEditorMode = searchParams.get("editor") === "1";
  const storefrontApi = useMemo(
    () =>
      api ??
      createPublicStorefrontApi(createPublicStorefrontApiOptions(storeSlug)),
    [api, storeSlug],
  );
  const [retryKey, setRetryKey] = useState(0);
  const [detailRetryKey, setDetailRetryKey] = useState(0);
  const [snapshot, setSnapshot] = useState<PublicStorefrontSnapshot>({
    isLoading: true,
  });
  const [detailSnapshot, setDetailSnapshot] =
    useState<PublicListingDetailSnapshot>({
      isLoading: Boolean(searchParams.get("listing")),
      listingSlug: searchParams.get("listing"),
    });
  const [previewConfig, setPreviewConfig] =
    useState<WebsiteBuilderPreviewConfig | null>(null);

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

  useEffect(() => {
    const listingSlug = searchParams.get("listing");
    setDetailSnapshot((current) => {
      if (current.listingSlug === listingSlug) return current;
      return { isLoading: Boolean(listingSlug), listingSlug };
    });
  }, [searchParams]);

  const state = useMemo(
    () => derivePublicStorefrontState(snapshot),
    [snapshot],
  );
  const renderedState = useMemo(() => {
    if (!isEditorMode || (state.kind !== "ready" && state.kind !== "empty")) {
      return state;
    }

    return {
      ...state,
      data: applyWebsiteBuilderPreviewToStorefrontData(
        state.data,
        previewConfig,
      ),
    };
  }, [isEditorMode, previewConfig, state]);

  useEffect(() => {
    if (!isEditorMode) setPreviewConfig(null);
  }, [isEditorMode]);

  useEffect(() => {
    if (!isEditorMode) return undefined;

    const handlePreviewMessage = (event: MessageEvent) => {
      const data: unknown = event.data;
      if (event.origin !== window.location.origin) return;
      if (!isEditorUpdateMessage(data)) return;
      setPreviewConfig((current) =>
        mergeWebsiteBuilderPreviewPayload(current, data.payload),
      );
    };

    window.addEventListener("message", handlePreviewMessage);
    return () => window.removeEventListener("message", handlePreviewMessage);
  }, [isEditorMode]);

  useEffect(() => {
    if (renderedState.kind !== "ready" && renderedState.kind !== "empty")
      return;
    return applyPublicStorefrontMetadata(renderedState.data);
  }, [renderedState]);

  const setListingSearchParam = (listingSlug: string | null) => {
    setSearchParams(setListingParam(searchParams, listingSlug));
  };

  if (renderedState.kind === "ready") {
    return (
      <PublicStorefront
        data={renderedState.data}
        detail={detailSnapshot}
        onCloseListing={() => setListingSearchParam(null)}
        onOpenListing={setListingSearchParam}
        onRetryListing={() => setDetailRetryKey((current) => current + 1)}
        onSubmitListingInterest={(listingSlug, input) =>
          storefrontApi.submitListingInterest(listingSlug, input)
        }
      />
    );
  }

  if (renderedState.kind === "empty") {
    return (
      <StorefrontStateFrame
        icon={<SearchX aria-hidden="true" className="size-6" />}
        title="Estoque indisponível"
      />
    );
  }

  if (renderedState.kind === "error") {
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
        title="Vitrine temporariamente indisponível"
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

export function setListingParam(
  searchParams: URLSearchParams,
  listingSlug: string | null,
) {
  const next = new URLSearchParams(searchParams);
  if (listingSlug) {
    next.set("listing", listingSlug);
  } else {
    next.delete("listing");
  }
  return next;
}

function isEditorUpdateMessage(
  value: unknown,
): value is { payload: Record<string, unknown>; type: "editor:update" } {
  if (!value || typeof value !== "object") return false;
  const message = value as Record<string, unknown>;
  return (
    message.type === "editor:update" &&
    Boolean(message.payload) &&
    typeof message.payload === "object" &&
    !Array.isArray(message.payload)
  );
}

function createPublicStorefrontApiOptions(storeSlug?: string) {
  const baseUrl = getPublicStorefrontApiBaseUrl();

  return {
    ...(baseUrl ? { baseUrl } : {}),
    fetch: window.fetch.bind(window),
    ...(storeSlug ? { storeSlug } : {}),
  };
}

function getPublicStorefrontApiBaseUrl() {
  const env = import.meta.env as unknown as {
    VITE_API_BASE_URL?: string;
  };

  return env.VITE_API_BASE_URL;
}
