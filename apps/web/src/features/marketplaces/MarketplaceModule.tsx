import { RefreshCcw, Store } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  FeatureActionButton,
  FeaturePageShell,
  FeatureToolbar,
} from "../../components/ui/FeatureLayout";
import {
  FeatureEmptyState,
  FeatureLoadingState,
} from "../../components/ui/FeatureStates";
import type { MarketplaceApi } from "./apiClient";
import { MarketplaceErrorAlert } from "./MarketplaceErrorAlert";
import {
  MarketplaceBatchProgress,
  MarketplaceJobList,
  MarketplaceOperationsOverview,
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
import "./marketplaceCommandBar.css";

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
    <FeaturePageShell mainClassName="marketplace-shell">
      <FeatureToolbar className="marketplace-command-bar">
        <div className="marketplace-command-bar__identity">
          <span className="marketplace-command-bar__mark">
            <Store aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="marketplace-command-bar__meta">Canais de venda</p>
            <h1>Marketplaces da loja</h1>
            <p className="marketplace-command-bar__description">
              Revise conexões, pendências e lotes antes de publicar o estoque.
            </p>
          </div>
        </div>
        <div
          aria-label="Ações dos marketplaces"
          className="marketplace-command-bar__actions"
          role="toolbar"
        >
          <FeatureActionButton
            icon={RefreshCcw}
            label="Atualizar"
            onClick={() => void refresh()}
          />
        </div>
      </FeatureToolbar>
      {status.kind === "error" ? (
        <MarketplaceErrorAlert {...status.display} />
      ) : null}
      {overview ? (
        <>
          <MarketplaceOperationsOverview overview={overview} />
          <div className="marketplace-section-heading marketplace-section-heading--channels">
            <div>
              <span className="marketplace-section-heading__eyebrow">
                Canais disponíveis
              </span>
              <h2>Conexões da loja</h2>
              <p>
                Cada canal mantém seu próprio contrato, credenciais e retorno
                operacional.
              </p>
            </div>
          </div>
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
          {selectedPreview ? (
            <MarketplacePreviewPanel
              plan={selectedPreview}
              provider={selectedProvider}
            />
          ) : null}
          {lastRun ? <MarketplaceBatchProgress lastRun={lastRun} /> : null}
          <MarketplaceJobList overview={overview} onRetry={retryJob} />
        </>
      ) : status.kind === "error" ? (
        <FeatureEmptyState
          action={
            <FeatureActionButton
              icon={RefreshCcw}
              label="Tentar carregar novamente"
              onClick={() => void refresh()}
            />
          }
          body="As conexões e publicações não puderam ser consultadas. Nenhuma sincronização foi iniciada."
          icon={Store}
          title="Canais de venda indisponíveis"
        />
      ) : (
        <FeatureLoadingState className="marketplace-empty">
          Carregando canais de venda
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
    "Não foi possível concluir a ação no marketplace.",
  );
}
