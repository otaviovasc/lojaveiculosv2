import { CheckCircle2, RefreshCcw, Store } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import AnimatedContent from "../../components/ui/AnimatedContent";
import {
  FeatureActionButton,
  FeaturePageShell,
  FeatureToolbar,
} from "../../components/ui/FeatureLayout";
import {
  FeatureAlert,
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
import { providerLabels } from "./marketplaceLabels";
import {
  marketplaceRedirectUri,
  readMarketplaceOauthCallback,
} from "./marketplaceOauthCallback";
import { marketplaceProviderOrder } from "./marketplaceProviderPresentation";
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
  const oauthCallbackStartedRef = useRef(false);
  const redirectUri = marketplaceRedirectUri(window.location);

  const applyOverview = (nextOverview: MarketplaceOverview) => {
    setOverview(nextOverview);
    setSelectedProvider(
      (current) => current ?? orderedProviders(nextOverview)[0] ?? null,
    );
  };

  const refresh = async () => {
    setStatus({ kind: "loading" });
    try {
      const nextOverview = await marketplaceApi.getOverview();
      applyOverview(nextOverview);
      setStatus({ kind: "ready" });
    } catch (error) {
      setStatus({ kind: "error", display: errorDisplay(error) });
    }
  };

  useEffect(() => {
    if (oauthCallbackStartedRef.current) return;
    oauthCallbackStartedRef.current = true;
    void initializeMarketplace();
  }, []);

  const initializeMarketplace = async () => {
    const callback = readMarketplaceOauthCallback(window.location);
    if (callback.kind === "none") {
      await refresh();
      return;
    }

    if (callback.kind === "error") {
      clearOauthCallbackLocation();
      try {
        applyOverview(await marketplaceApi.getOverview());
      } catch {
        // The authorization error remains the most useful visible state.
      }
      setStatus({ kind: "error", display: oauthErrorDisplay(callback) });
      return;
    }

    setStatus({ kind: "saving", provider: callback.provider });
    try {
      await marketplaceApi.completeConnection({
        code: callback.code,
        provider: callback.provider,
        redirectUri,
      });
      applyOverview(await marketplaceApi.getOverview());
      clearOauthCallbackLocation();
      setStatus({
        kind: "saved",
        message: `${providerLabels[callback.provider]} conectado. Nenhum anúncio foi enviado.`,
      });
    } catch (error) {
      clearOauthCallbackLocation();
      setStatus({ kind: "error", display: errorDisplay(error) });
    }
  };

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
      applyOverview(await marketplaceApi.getOverview());
      setStatus({
        kind: "saved",
        message:
          nextStatus === "active"
            ? `${providerLabels[provider]} ativado. Gere uma prévia antes de enviar o estoque.`
            : `Envios ao ${providerLabels[provider]} pausados. Nenhum anúncio foi alterado agora.`,
      });
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
      applyOverview(await marketplaceApi.getOverview());
      setStatus({
        kind: "saved",
        message: `${providerLabels[provider]} conectado. Nenhum anúncio foi enviado.`,
      });
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
      setStatus({
        kind: "saved",
        message: `Prévia do ${providerLabels[provider]} pronta. Revise os bloqueios antes de enviar.`,
      });
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
      applyOverview(await marketplaceApi.getOverview());
      setStatus({
        kind: "saved",
        message: `Lote do ${providerLabels[provider]} enfileirado. Acompanhe o resultado das publicações abaixo.`,
      });
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
      applyOverview(await marketplaceApi.getOverview());
      setStatus({
        kind: "saved",
        message: `Nova tentativa enfileirada no ${providerLabels[job.provider]}.`,
      });
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
            isBusy={status.kind === "loading"}
            label="Atualizar"
            onClick={() => void refresh()}
          />
        </div>
      </FeatureToolbar>
      {status.kind === "error" ? (
        <MarketplaceErrorAlert {...status.display} />
      ) : null}
      {status.kind === "saved" ? (
        <FeatureAlert
          className="marketplace-feedback"
          icon={<CheckCircle2 aria-hidden="true" className="size-5" />}
          tone="success"
        >
          {status.message}
        </FeatureAlert>
      ) : null}
      {overview ? (
        <>
          <AnimatedContent distance={14} duration={0.32} trigger="mount">
            <MarketplaceOperationsOverview overview={overview} />
          </AnimatedContent>
          <div className="marketplace-section-heading marketplace-section-heading--channels">
            <div>
              <span className="marketplace-section-heading__eyebrow">
                Canais disponíveis
              </span>
              <h2>Conexões da loja</h2>
              <p>
                Conecte e revise cada canal conforme o contrato que ele exige. A
                prévia não publica nenhum anúncio.
              </p>
            </div>
          </div>
          <section className="marketplace-grid">
            {orderedProviders(overview).map((provider, index) => (
              <AnimatedContent
                delay={index * 0.06}
                distance={18}
                duration={0.38}
                key={provider}
                trigger="mount"
              >
                <MarketplaceProviderCard
                  account={overview.accounts.find(
                    (account) => account.provider === provider,
                  )}
                  isSaving={
                    status.kind === "saving" && status.provider === provider
                  }
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
              </AnimatedContent>
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
  | { kind: "saved"; message: string }
  | { kind: "saving"; provider: MarketplaceProvider };

function errorDisplay(error: unknown) {
  return formatMarketplaceError(
    error,
    "Não foi possível concluir a ação no marketplace.",
  );
}

function orderedProviders(overview: MarketplaceOverview) {
  return marketplaceProviderOrder.filter((provider) =>
    overview.providers.includes(provider),
  );
}

function clearOauthCallbackLocation() {
  window.history.replaceState({}, "", "/dashboard#/marketplaces");
}

function oauthErrorDisplay(
  callback: Extract<
    ReturnType<typeof readMarketplaceOauthCallback>,
    { kind: "error" }
  >,
): MarketplaceErrorDisplay {
  return {
    failed: "A conexão não foi concluída.",
    fix: callback.message,
    provider: callback.provider
      ? providerLabels[callback.provider]
      : "Canal não identificado",
    requestId: "Não informado",
    vehicleLabel: "Não se aplica",
  };
}
