import { AlertTriangle, CheckCircle2, RefreshCcw, Store } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import AnimatedContent from "../../components/ui/AnimatedContent";
import {
  FeatureActionButton,
  FeaturePageHeader,
  FeaturePageShell,
} from "../../components/ui/FeatureLayout";
import {
  FeatureAlert,
  FeatureEmptyState,
  FeatureLoadingState,
} from "../../components/ui/FeatureStates";
import type { MarketplaceApi } from "./apiClient";
import { MarketplaceErrorAlert } from "./MarketplaceErrorAlert";
import {
  MarketplaceJobList,
  MarketplaceOperationsOverview,
  MarketplaceProviderCard,
  MarketplaceStockPanel,
} from "./MarketplacePanels";
import {
  formatMarketplaceError,
  type MarketplaceErrorDisplay,
} from "./marketplaceErrors";
import { providerLabels } from "./marketplaceLabels";
import { readMarketplaceOauthCallback } from "./marketplaceOauthCallback";
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
import {
  clearCrmOlxOauthReturn,
  hasCrmOlxOauthReturn,
} from "../crm/crmOlxOauthReturn";

export function MarketplaceModule({ api }: { api?: MarketplaceApi }) {
  const [{ callback: initialCallback, crmOlxReturn }] = useState(() => {
    const callback = readMarketplaceOauthCallback(window.location);
    return {
      callback,
      crmOlxReturn: callback.kind !== "none" && hasCrmOlxOauthReturn(),
    };
  });
  const marketplaceApi = useMemo(
    () => api ?? createMarketplaceRuntimeApi(),
    [api],
  );
  const [overview, setOverview] = useState<MarketplaceOverview | null>(null);
  const [status, setStatus] = useState<MarketplaceStatus>(() =>
    crmOlxReturn
      ? {
          kind: "olx-return",
          message:
            initialCallback.kind === "result-error"
              ? "A conexão com a OLX não foi concluída. Você voltará para Conexões para tentar novamente."
              : "Conectando OLX. Você voltará para o CRM automaticamente.",
        }
      : { kind: "loading" },
  );
  const [previews, setPreviews] = useState<Record<string, ProviderPreview>>({});
  const [selectedProvider, setSelectedProvider] =
    useState<MarketplaceProvider | null>(null);
  const [lastRuns, setLastRuns] = useState<
    Partial<Record<MarketplaceProvider, MarketplaceStockSyncRunResponse>>
  >({});
  const oauthCallbackStartedRef = useRef(false);

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
    const callback = initialCallback;
    if (callback.kind === "none") {
      await refresh();
      return;
    }

    if (callback.kind === "result-error") {
      if (crmOlxReturn) {
        redirectToCrmConnections();
        return;
      }
      clearCrmOlxOauthReturn();
      clearOauthCallbackLocation();
      try {
        applyOverview(await marketplaceApi.getOverview());
      } catch {
        // The authorization error remains the most useful visible state.
      }
      setStatus({ kind: "error", display: oauthErrorDisplay(callback) });
      return;
    }

    if (!crmOlxReturn) {
      setStatus(
        callback.kind === "staged"
          ? { kind: "saving", provider: callback.provider }
          : { kind: "loading" },
      );
    }
    try {
      const result = await marketplaceApi.completeConnection(
        callback.kind === "staged"
          ? { transactionId: callback.transactionId }
          : callback.kind === "inline-error"
            ? { error: callback.error, state: callback.state }
            : { code: callback.code, state: callback.state },
      );
      if (result.kind === "cancelled") {
        if (crmOlxReturn) {
          setStatus({
            kind: "olx-return",
            message:
              "A autorização da OLX foi cancelada. Você voltará para Conexões para tentar novamente.",
          });
          redirectToCrmConnections();
          return;
        }
        clearCrmOlxOauthReturn();
        clearOauthCallbackLocation();
        setStatus({
          kind: "error",
          display: oauthErrorDisplay({
            kind: "result-error",
            provider: result.provider,
          }),
        });
        return;
      }
      clearOauthCallbackLocation();
      if (result.account.provider === "olx" && crmOlxReturn) {
        redirectToCrmConnections();
        return;
      }
      clearCrmOlxOauthReturn();
      applyOverview(await marketplaceApi.getOverview());
      if (result.kind === "partial") {
        setStatus({
          kind: "partial",
          message: `${providerLabels[result.account.provider]} autorizada parcialmente. Uma ou mais capacidades de Chat, Leads ou Estoque precisam de atenção. Use Revisar conexão para tentar novamente. Nenhum anúncio foi enviado.`,
        });
        return;
      }
      setStatus({
        kind: "saved",
        message: `${providerLabels[result.account.provider]} conectado. Nenhum anúncio foi enviado.`,
      });
    } catch (error) {
      if (crmOlxReturn) {
        setStatus({
          kind: "olx-return",
          message:
            "Não foi possível confirmar a conexão da OLX agora. Você voltará para Conexões para tentar novamente.",
        });
        redirectToCrmConnections();
        return;
      }
      clearCrmOlxOauthReturn();
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
      });
      window.location.assign(result.authorizationUrl);
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
      setLastRuns((current) => ({ ...current, [provider]: result }));
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

  const reconcileJob = async (job: MarketplaceJob) => {
    setStatus({ kind: "saving", provider: job.provider });
    try {
      const reconciled = await marketplaceApi.reconcileSyncJob(job.id);
      applyOverview(await marketplaceApi.getOverview());
      setStatus({
        kind: "saved",
        message:
          reconciled.status === "succeeded"
            ? `${providerLabels[job.provider]} confirmou a operação.`
            : reconciled.status === "failed"
              ? reconciled.metadata.providerResult?.providerStatus === "refused"
                ? `${providerLabels[job.provider]} recusou a operação. Revise os dados do anúncio antes de tentar novamente.`
                : `${providerLabels[job.provider]} não concluiu a operação. Revise o detalhe técnico antes de decidir se deve tentar novamente.`
              : `A operação continua aguardando confirmação do ${providerLabels[job.provider]}. Não é necessário reenviar.`,
      });
    } catch (error) {
      setStatus({ kind: "error", display: errorDisplay(error) });
    }
  };

  const selectedPreview = selectedProvider
    ? (previews[selectedProvider]?.plan ?? null)
    : null;
  const selectedLastRun = selectedProvider
    ? (lastRuns[selectedProvider] ?? null)
    : null;

  if (status.kind === "olx-return") {
    return (
      <FeaturePageShell mainClassName="marketplace-shell">
        <div className="crm-olx-oauth-return" role="status">
          <FeatureLoadingState>{status.message}</FeatureLoadingState>
        </div>
      </FeaturePageShell>
    );
  }

  return (
    <FeaturePageShell mainClassName="marketplace-shell">
      <FeaturePageHeader
        actions={
          <FeatureActionButton
            icon={RefreshCcw}
            isBusy={status.kind === "loading"}
            label="Atualizar"
            onClick={() => void refresh()}
          />
        }
        actionsLabel="Ações dos marketplaces"
        description="Revise conexões, pendências e lotes antes de publicar o estoque."
        eyebrow="Canais de venda"
        title="Marketplaces"
      />
      {status.kind === "error" ? (
        <MarketplaceErrorAlert {...status.display} />
      ) : null}
      {status.kind === "saved" ? (
        <FeatureAlert
          icon={<CheckCircle2 aria-hidden="true" className="size-5" />}
          tone="success"
        >
          {status.message}
        </FeatureAlert>
      ) : null}
      {status.kind === "partial" ? (
        <FeatureAlert
          icon={<AlertTriangle aria-hidden="true" className="size-5" />}
          tone="warning"
        >
          {status.message}
        </FeatureAlert>
      ) : null}
      {overview ? (
        <>
          <AnimatedContent distance={14} duration={0.32} trigger="mount">
            <MarketplaceOperationsOverview overview={overview} />
          </AnimatedContent>
          <section aria-label="Conexões da loja" className="marketplace-grid">
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
                  onConnect={createConnectUrl}
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
          {selectedPreview || selectedLastRun ? (
            <MarketplaceStockPanel
              lastRun={selectedLastRun}
              plan={selectedPreview}
              provider={selectedProvider}
            />
          ) : null}
          <MarketplaceJobList
            onReconcile={reconcileJob}
            onRetry={retryJob}
            overview={overview}
          />
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
  | { kind: "olx-return"; message: string }
  | { kind: "partial"; message: string }
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

function redirectToCrmConnections() {
  window.location.assign("/dashboard#/crm?surface=conversations");
}

function oauthErrorDisplay(
  callback: Extract<
    ReturnType<typeof readMarketplaceOauthCallback>,
    { kind: "result-error" }
  >,
): MarketplaceErrorDisplay {
  return {
    failed: callback.errorCode
      ? `A conexão não foi concluída (${callback.errorCode}).`
      : "A conexão não foi concluída.",
    fix: "A autorização foi cancelada, recusada ou expirou. Inicie a conexão novamente.",
    provider: callback.provider
      ? providerLabels[callback.provider]
      : "Canal não identificado",
    requestId: callback.requestId ?? "Não informado",
    vehicleLabel: "Não se aplica",
  };
}
