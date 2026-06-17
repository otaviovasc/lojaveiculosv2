import { RefreshCcw, SearchX } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  createPublicStorefrontApi,
  type PublicStorefrontApi,
} from "./apiClient";
import { PublicStorefront } from "./PublicStorefront";
import {
  derivePublicStorefrontState,
  type PublicStorefrontSnapshot,
} from "./state";

export function PublicStorefrontPage({ api }: { api?: PublicStorefrontApi }) {
  const storefrontApi = useMemo(
    () =>
      api ?? createPublicStorefrontApi({ fetch: window.fetch.bind(window) }),
    [api],
  );
  const [retryKey, setRetryKey] = useState(0);
  const [snapshot, setSnapshot] = useState<PublicStorefrontSnapshot>({
    isLoading: true,
  });

  useEffect(() => {
    let isActive = true;
    setSnapshot({ isLoading: true });

    storefrontApi
      .listListings({ limit: 12 })
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

  const state = derivePublicStorefrontState(snapshot);

  if (state.kind === "ready") return <PublicStorefront data={state.data} />;

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

function StorefrontStateFrame({
  action,
  icon,
  title,
}: {
  action?: ReactNode;
  icon: ReactNode;
  title: string;
}) {
  return (
    <main className="mx-auto flex min-h-[32rem] w-full max-w-7xl items-center justify-center px-4 py-6 lg:px-6 lg:py-8">
      <section className="w-full max-w-md rounded-lg border border-line bg-panel p-6 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-accent-soft text-accent">
          {icon}
        </div>
        <h2 className="mt-4 text-xl font-black">{title}</h2>
        {action}
      </section>
    </main>
  );
}
