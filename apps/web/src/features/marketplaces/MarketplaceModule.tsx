import { RefreshCcw, Store } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createMarketplaceApi, type MarketplaceApi } from "./apiClient";
import {
  MarketplaceJobList,
  MarketplaceProviderCard,
} from "./MarketplacePanels";
import { createMarketplaceApiOptions } from "./runtimeApi";
import type {
  MarketplaceAccountStatus,
  MarketplaceOverview,
  MarketplaceProvider,
  MarketplaceSyncJobType,
} from "./types";

export function MarketplaceModule({ api }: { api?: MarketplaceApi }) {
  const marketplaceApi = useMemo(() => api ?? createRuntimeApi(), [api]);
  const [overview, setOverview] = useState<MarketplaceOverview | null>(null);
  const [status, setStatus] = useState<MarketplaceStatus>({ kind: "loading" });
  const [oauthCodes, setOauthCodes] = useState<Record<string, string>>({});
  const [listingIds, setListingIds] = useState<Record<string, string>>({});
  const redirectUri = `${window.location.origin}/marketplaces/oauth/callback`;

  const refresh = async () => {
    setStatus({ kind: "loading" });
    try {
      setOverview(await marketplaceApi.getOverview());
      setStatus({ kind: "ready" });
    } catch (error) {
      setStatus({ kind: "error", message: errorMessage(error) });
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const upsertAccount = async (
    provider: MarketplaceProvider,
    nextStatus: MarketplaceAccountStatus,
  ) => {
    setStatus({ kind: "saving", provider });
    try {
      await marketplaceApi.upsertAccount(provider, {
        config: { rollout: "v2_foundation" },
        provider,
        status: nextStatus,
      });
      setOverview(await marketplaceApi.getOverview());
      setStatus({ kind: "saved" });
    } catch (error) {
      setStatus({ kind: "error", message: errorMessage(error) });
    }
  };

  const createConnectUrl = async (provider: MarketplaceProvider) => {
    setStatus({ kind: "saving", provider });
    try {
      const result = await marketplaceApi.createConnectUrl({
        provider,
        redirectUri,
      });
      window.location.assign(result.authorizationUrl);
    } catch (error) {
      setStatus({ kind: "error", message: errorMessage(error) });
    }
  };

  const completeConnection = async (provider: MarketplaceProvider) => {
    const code = oauthCodes[provider]?.trim();
    if (!code) return;
    setStatus({ kind: "saving", provider });
    try {
      await marketplaceApi.completeConnection({ code, provider, redirectUri });
      setOauthCodes((current) => ({ ...current, [provider]: "" }));
      setOverview(await marketplaceApi.getOverview());
      setStatus({ kind: "saved" });
    } catch (error) {
      setStatus({ kind: "error", message: errorMessage(error) });
    }
  };

  const createJob = async (
    provider: MarketplaceProvider,
    jobType: MarketplaceSyncJobType,
  ) => {
    setStatus({ kind: "saving", provider });
    try {
      await marketplaceApi.createSyncJob(provider, {
        jobType,
        metadata: {
          listingId: listingIds[provider]?.trim(),
          requestedFrom: "marketplace_module",
        },
        provider,
      });
      setOverview(await marketplaceApi.getOverview());
      setStatus({ kind: "saved" });
    } catch (error) {
      setStatus({ kind: "error", message: errorMessage(error) });
    }
  };

  const runJob = async (jobId: string) => {
    setStatus({ kind: "saving", provider: "olx" });
    try {
      await marketplaceApi.runSyncJob(jobId);
      setOverview(await marketplaceApi.getOverview());
      setStatus({ kind: "saved" });
    } catch (error) {
      setStatus({ kind: "error", message: errorMessage(error) });
    }
  };

  const updateOauthCode = (provider: MarketplaceProvider, value: string) => {
    setOauthCodes((current) => ({ ...current, [provider]: value }));
  };

  const updateListingId = (provider: MarketplaceProvider, value: string) => {
    setListingIds((current) => ({ ...current, [provider]: value }));
  };

  return (
    <main className="marketplace-shell">
      <section className="marketplace-hero">
        <div>
          <span className="marketplace-badge">
            <Store aria-hidden="true" className="size-4" />
            Portal marketplaces
          </span>
          <h2>OLX e Mercado Livre</h2>
          <p>
            Conexoes por loja, syncs auditaveis e filas prontas para publicar
            estoque e importar leads.
          </p>
        </div>
        <button
          aria-label="Atualizar marketplaces"
          className="marketplace-icon-action"
          onClick={() => void refresh()}
          type="button"
        >
          <RefreshCcw aria-hidden="true" className="size-5" />
        </button>
      </section>

      {status.kind === "error" ? (
        <p className="marketplace-alert">{status.message}</p>
      ) : null}

      {overview ? (
        <>
          <section className="marketplace-grid">
            {overview.providers.map((provider) => {
              const account = overview.accounts.find(
                (item) => item.provider === provider,
              );
              const isSaving =
                status.kind === "saving" && status.provider === provider;
              return (
                <MarketplaceProviderCard
                  account={account}
                  isSaving={isSaving}
                  key={provider}
                  listingId={listingIds[provider] ?? ""}
                  oauthCode={oauthCodes[provider] ?? ""}
                  onCompleteConnection={completeConnection}
                  onConnect={createConnectUrl}
                  onCreateJob={createJob}
                  onListingIdChange={updateListingId}
                  onOauthCodeChange={updateOauthCode}
                  onStatusChange={upsertAccount}
                  provider={provider}
                />
              );
            })}
          </section>
          <MarketplaceJobList overview={overview} onRun={runJob} />
        </>
      ) : (
        <section className="marketplace-empty">Carregando marketplaces</section>
      )}
    </main>
  );
}

type MarketplaceStatus =
  | { kind: "error"; message: string }
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "saved" }
  | { kind: "saving"; provider: MarketplaceProvider };

function createRuntimeApi(): MarketplaceApi {
  return {
    completeConnection: async (input) =>
      createMarketplaceApi(
        await createMarketplaceApiOptions(),
      ).completeConnection(input),
    createConnectUrl: async (input) =>
      createMarketplaceApi(
        await createMarketplaceApiOptions(),
      ).createConnectUrl(input),
    createSyncJob: async (provider, input) =>
      createMarketplaceApi(await createMarketplaceApiOptions()).createSyncJob(
        provider,
        input,
      ),
    getOverview: async () =>
      createMarketplaceApi(await createMarketplaceApiOptions()).getOverview(),
    runSyncJob: async (jobId) =>
      createMarketplaceApi(await createMarketplaceApiOptions()).runSyncJob(
        jobId,
      ),
    upsertAccount: async (provider, input) =>
      createMarketplaceApi(await createMarketplaceApiOptions()).upsertAccount(
        provider,
        input,
      ),
  };
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
