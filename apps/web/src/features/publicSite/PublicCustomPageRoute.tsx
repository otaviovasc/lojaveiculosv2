import { Home, RefreshCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { StatusIllustration } from "../../components/ui/StatusIllustration";
import { AppApiError } from "../../lib/apiErrors";
import {
  createPublicStorefrontApi,
  type PublicStorefrontApi,
} from "./apiClient";
import { PageBuilderRenderer } from "./PageBuilderRenderer";
import {
  StorefrontLoadingFrame,
  StorefrontStateFrame,
} from "./PublicStorefrontPageSupport";
import type { PublicStorefrontCustomPageData } from "./types";

type PublicCustomPageState =
  | { data: PublicStorefrontCustomPageData; kind: "ready" }
  | { error: Error; kind: "error" }
  | { kind: "loading" }
  | { kind: "not-found" };

export function PublicCustomPageRoute({ api }: { api?: PublicStorefrontApi }) {
  const { pageSlug, storeSlug } = useParams<{
    pageSlug: string;
    storeSlug?: string;
  }>();
  const [query] = useSearchParams();
  const storefrontApi = useMemo(
    () =>
      api ??
      createPublicStorefrontApi(createPublicStorefrontApiOptions(storeSlug)),
    [api, storeSlug],
  );
  const [retryKey, setRetryKey] = useState(0);
  const [state, setState] = useState<PublicCustomPageState>({
    kind: "loading",
  });

  useEffect(() => {
    if (!pageSlug) return;
    let isActive = true;
    setState({ kind: "loading" });
    storefrontApi
      .getCustomPage(pageSlug, query.get("token"))
      .then((data) => {
        if (isActive) setState({ data, kind: "ready" });
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        if (error instanceof AppApiError && error.status === 404) {
          setState({ kind: "not-found" });
          return;
        }
        setState({
          error: error instanceof Error ? error : new Error(String(error)),
          kind: "error",
        });
      });
    return () => {
      isActive = false;
    };
  }, [pageSlug, query, retryKey, storefrontApi]);

  useEffect(() => {
    if (state.kind !== "ready") return;
    return applyCustomPageMetadata(state.data);
  }, [state]);

  if (state.kind === "ready") {
    return (
      <PageBuilderRenderer
        config={state.data.config}
        page={state.data.page}
        storeSlug={storeSlug ?? state.data.store.slug}
        vehicles={state.data.vehicles}
      />
    );
  }

  if (state.kind === "not-found") {
    return (
      <StorefrontStateFrame
        action={
          <Button asChild variant="outline">
            <a href="/">
              <Home aria-hidden="true" />
              Voltar para o início
            </a>
          </Button>
        }
        body="Não encontramos esta página. Confira o link recebido ou volte para a vitrine da loja."
        illustration={<StatusIllustration variant="lost-car" />}
        title="Página não encontrada"
      />
    );
  }

  if (state.kind === "error") {
    return (
      <StorefrontStateFrame
        action={
          <Button
            onClick={() => setRetryKey((current) => current + 1)}
            type="button"
            variant="brand"
          >
            <RefreshCcw aria-hidden="true" />
            Tentar novamente
          </Button>
        }
        body="Não foi possível carregar esta página agora. Verifique sua conexão e tente novamente em instantes."
        illustration={<StatusIllustration variant="offline" />}
        title="Página temporariamente indisponível"
        tone="danger"
      />
    );
  }

  return <StorefrontLoadingFrame title="Carregando página" />;
}

function applyCustomPageMetadata(data: PublicStorefrontCustomPageData) {
  const title = data.page.seo?.metaTitle ?? data.page.title;
  const description =
    data.page.seo?.metaDescription ??
    data.page.description ??
    `${data.store.name} - ${data.page.title}`;
  const previousTitle = document.title;
  const descriptionMeta = upsertMeta("description");
  const robotsMeta = upsertMeta("robots");
  const previousDescription = descriptionMeta.getAttribute("content");
  const previousRobots = robotsMeta.getAttribute("content");

  document.title = title;
  descriptionMeta.setAttribute("content", description);
  robotsMeta.setAttribute("content", "index,follow");

  return () => {
    document.title = previousTitle;
    restoreAttribute(descriptionMeta, "content", previousDescription);
    restoreAttribute(robotsMeta, "content", previousRobots);
  };
}

function createPublicStorefrontApiOptions(storeSlug?: string) {
  const env = import.meta.env as unknown as { VITE_API_BASE_URL?: string };
  return {
    ...(env.VITE_API_BASE_URL ? { baseUrl: env.VITE_API_BASE_URL } : {}),
    fetch: window.fetch.bind(window),
    ...(storeSlug ? { storeSlug } : {}),
  };
}

function upsertMeta(name: string) {
  const current = document.querySelector<HTMLMetaElement>(
    `meta[name="${name}"]`,
  );
  if (current) return current;
  const meta = document.createElement("meta");
  meta.setAttribute("name", name);
  document.head.appendChild(meta);
  return meta;
}

function restoreAttribute(
  element: HTMLElement,
  name: string,
  previousValue: string | null,
) {
  if (previousValue === null) element.removeAttribute(name);
  else element.setAttribute(name, previousValue);
}
