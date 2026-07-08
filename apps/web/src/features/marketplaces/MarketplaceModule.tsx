import { RefreshCcw, Store } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  FeatureActionButton,
  FeaturePageHeader,
  FeaturePageShell,
} from "../../components/ui/FeatureLayout";
import { FeatureLoadingState } from "../../components/ui/FeatureStates";
import type { MarketplaceApi } from "./apiClient";
import { MarketplaceErrorAlert } from "./MarketplaceErrorAlert";
import {
  MarketplaceBatchProgress,
  MarketplaceJobList,
  MarketplacePreviewPanel,
  MarketplaceProviderCard,
} from "./MarketplacePanels";
import {
  formatMarketplaceError,
  type MarketplaceErrorDisplay,
} from "./marketplaceErrors";
import { createMarketplaceRuntimeApi } from "./runtimeApi";
import type {
  MarketplaceAccountStatus,
  MarketplaceJob,
  MarketplaceOverview,
  MarketplaceProvider,
  MarketplaceStockPlan,
  MarketplaceStockSyncRunResponse,
} from "./types";

export function MarketplaceModule({ api }: { api?: MarketplaceApi }) {
  const marketplaceApi = useMemo(
    () => api ?? createMarketplaceRuntimeApi(),
    [api],
  );
  const [overview, setOverview] = useState<MarketplaceOverview | null>(null);
  const [status, setStatus] = useState<MarketplaceStatus>({ kind: "loading" });
  const [oauthCodes, setOauthCodes] = useState<Record<string, string>>({});
  const [previews, setPreviews] = useState<Record<string, ProviderPreview>>({});
  const [selectedProvider, setSelectedProvider] =
    useState<MarketplaceProvider | null>(null);
  const [lastRun, setLastRun] =
    useState<MarketplaceStockSyncRunResponse | null>(null);
  const redirectUri = `${window.location.origin}/marketplaces/oauth/callback`;

  const refresh = async () => {
    setStatus({ kind: "loading" });
    try {
      const nextOverview = await marketplaceApi.getOverview();
      setOverview(nextOverview);
      setSelectedProvider(
        (current) => current ?? nextOverview.providers[0] ?? null,
      );
      setStatus({ kind: "ready" });
    } catch (error) {
      setStatus({ kind: "error", display: errorDisplay(error) });
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
        config: { rollout: "v2_stock_sync" },
        provider,
        status: nextStatus,
      });
      setOverview(await marketplaceApi.getOverview());
      setStatus({ kind: "saved" });
    } catch (error) {
      setStatus({ kind: "error", display: errorDisplay(error) });
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
      setStatus({ kind: "error", display: errorDisplay(error) });
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
      setStatus({ kind: "error", display: errorDisplay(error) });
    }
  };

  const previewStock = async (provider: MarketplaceProvider) => {
    setStatus({ kind: "saving", provider });
    try {
      const preview = await marketplaceApi.previewStockSync(provider, {
        provider,
      });
      setPreviews((current) => ({
        ...current,
        [provider]: { batchId: preview.batchId, plan: preview.plan },
      }));
      setSelectedProvider(provider);
      setStatus({ kind: "saved" });
    } catch (error) {
      setStatus({ kind: "error", display: errorDisplay(error) });
    }
  };

  const runStock = async (provider: MarketplaceProvider) => {
    const preview = previews[provider];
    setStatus({ kind: "saving", provider });
    try {
      const input = preview?.batchId
        ? { batchId: preview.batchId, provider }
        : { provider };
      const result = await marketplaceApi.runStockSync(provider, input);
      setLastRun(result);
      setPreviews((current) => ({
        ...current,
        [provider]: { batchId: result.batchId, plan: result.plan },
      }));
      setSelectedProvider(provider);
      setOverview(await marketplaceApi.getOverview());
      setStatus({ kind: "saved" });
    } catch (error) {
      setStatus({ kind: "error", display: errorDisplay(error) });
    }
  };

  const retryJob = async (job: MarketplaceJob) => {
    setStatus({ kind: "saving", provider: job.provider });
    try {
      await marketplaceApi.retrySyncJob(job.id, {
        reason: "retry_from_marketplace_stock_sync_ui",
      });
      setOverview(await marketplaceApi.getOverview());
      setStatus({ kind: "saved" });
    } catch (error) {
      setStatus({ kind: "error", display: errorDisplay(error) });
    }
  };

  const updateOauthCode = (provider: MarketplaceProvider, value: string) => {
    setOauthCodes((current) => ({ ...current, [provider]: value }));
  };

  const selectedPreview = selectedProvider
    ? (previews[selectedProvider]?.plan ?? null)
    : null;

  return (
    <FeaturePageShell className="marketplace-shell" variant="content">
      <FeaturePageHeader
        actions={
          <FeatureActionButton
            icon={RefreshCcw}
            label="Atualizar"
            onClick={() => void refresh()}
          />
        }
        description="Conexoes por loja, checklist operacional e publicacao manual de estoque."
        eyebrow={
          <>
            <Store aria-hidden="true" className="size-4" />
            Portal marketplaces
          </>
        }
        title="OLX e Mercado Livre"
      />
      {status.kind === "error" ? (
        <MarketplaceErrorAlert {...status.display} />
      ) : null}
      {overview ? (
        <>
          <section className="marketplace-grid">
            {overview.providers.map((provider) => (
              <MarketplaceProviderCard
                account={overview.accounts.find(
                  (account) => account.provider === provider,
                )}
                isSaving={
                  status.kind === "saving" && status.provider === provider
                }
                key={provider}
                oauthCode={oauthCodes[provider] ?? ""}
                onCompleteConnection={completeConnection}
                onConnect={createConnectUrl}
                onOauthCodeChange={updateOauthCode}
                onPreview={previewStock}
                onRun={runStock}
                onStatusChange={upsertAccount}
                preview={previews[provider]?.plan ?? null}
                provider={provider}
                state={overview.providerStates.find(
                  (state) => state.provider === provider,
                )}
              />
            ))}
          </section>
          <MarketplacePreviewPanel
            plan={selectedPreview}
            provider={selectedProvider}
          />
          <MarketplaceBatchProgress lastRun={lastRun} />
          <MarketplaceJobList overview={overview} onRetry={retryJob} />
        </>
      ) : (
        <FeatureLoadingState className="marketplace-empty">
          Carregando marketplaces
        </FeatureLoadingState>
      )}
    </FeaturePageShell>
  );
}

type ProviderPreview = {
  batchId: string;
  plan: MarketplaceStockPlan;
};

type MarketplaceStatus =
  | { display: MarketplaceErrorDisplay; kind: "error" }
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "saved" }
  | { kind: "saving"; provider: MarketplaceProvider };

function errorDisplay(error: unknown) {
  return formatMarketplaceError(
    error,
    "Nao foi possivel concluir a acao de marketplace.",
  );
}
