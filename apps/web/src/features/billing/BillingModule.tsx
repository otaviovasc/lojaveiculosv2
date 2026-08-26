import { Receipt, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FeaturePageShell } from "../../components/ui/FeatureLayout";
import {
  FeatureAlert,
  FeatureLoadingState,
} from "../../components/ui/FeatureStates";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { cn } from "../../lib/utils";
import "../../styles/billing-composition.css";
import "../../styles/billing-panels.css";
import "../../styles/billing-upgrade.css";
import { createBillingApi, type BillingApi } from "./apiClient";
import { BillingAutomaticBillingPanel } from "./BillingAutomaticBillingPanel";
import {
  readBillingCheckoutReturn,
  redirectToCheckout,
} from "./billingCheckoutReturn";
import {
  billingPlanHirePollDelays,
  isBillingPlanHireTerminal,
  trustedBillingPlanHireId,
} from "./billingPlanHireState";
import {
  BillingAllocationTable,
  BillingEventList,
  BillingKpiGrid,
} from "./BillingPanels";
import { BillingSignupFlow } from "./BillingSignupFlow";
import { createBillingApiOptions } from "./runtimeApi";
import type {
  BillingOverview,
  BillingPlan,
  BillingPlanHire,
  BillingProviderStatus,
} from "./types";

const legacyActiveHireStorageKey = "lojaveiculos.billing.active-hire";

export function BillingModule({ api }: { api?: BillingApi }) {
  const billingApi = useMemo(() => api ?? createRuntimeBillingApi(), [api]);
  const overviewGeneration = useRef(0);
  const actionGeneration = useRef(0);
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [providerStatus, setProviderStatus] =
    useState<BillingProviderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [providerError, setProviderError] = useState(false);
  const [hire, setHire] = useState<BillingPlanHire | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [quoteRequesting, setQuoteRequesting] = useState(false);
  const [quoteRequested, setQuoteRequested] = useState(false);
  const [pollingIndeterminate, setPollingIndeterminate] = useState(false);
  const [pollingHireId, setPollingHireId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"subscription" | "details">(
    "subscription",
  );
  const checkoutReturn = readBillingCheckoutReturn("store");
  const activeHireStorageKey = overview
    ? scopedActiveHireStorageKey(overview.tenantId, overview.storeId)
    : null;

  const loadOverview = useCallback(async () => {
    const generation = ++overviewGeneration.current;
    let nextOverview: BillingOverview;
    try {
      nextOverview = await billingApi.getOverview();
    } catch (cause) {
      if (generation !== overviewGeneration.current) return null;
      throw cause;
    }
    if (generation !== overviewGeneration.current) return null;
    setOverview(nextOverview);
    setSelectedPlanId(
      nextOverview.subscription?.plan?.id ??
        nextOverview.plans.find((plan) => plan.code === "free")?.id ??
        nextOverview.plans[0]?.id ??
        null,
    );
    return nextOverview;
  }, [billingApi]);

  useEffect(() => {
    let active = true;
    setOverview(null);
    setError(null);
    setProviderStatus(null);
    setProviderError(false);
    void loadOverview().catch(
      (cause) => active && setError(errorMessage(cause)),
    );
    void billingApi
      .getProviderStatus()
      .then((status) => active && setProviderStatus(status))
      .catch(() => active && setProviderError(true));
    return () => {
      active = false;
      overviewGeneration.current += 1;
      actionGeneration.current += 1;
    };
  }, [billingApi, loadOverview]);

  useEffect(() => {
    actionGeneration.current += 1;
    setHire(null);
    setPollingIndeterminate(false);
    setSubmitting(false);
    setQuoteRequesting(false);
    if (!activeHireStorageKey) {
      setPollingHireId(null);
      return;
    }
    setPollingHireId(readTrustedReturnedHireId(activeHireStorageKey));
  }, [activeHireStorageKey]);

  useEffect(() => {
    if (!pollingHireId) return;
    let cancelled = false;
    let timer: number | undefined;
    setPollingIndeterminate(false);
    const poll = async (attempt: number) => {
      try {
        const nextHire = await billingApi.getPlanHire(pollingHireId);
        if (cancelled) return;
        setHire(nextHire);
        if (isBillingPlanHireTerminal(nextHire)) {
          if (nextHire.status === "paid_active") {
            const nextOverview = await loadOverview();
            if (cancelled) return;
            if (!nextOverview) return;
          }
          if (activeHireStorageKey)
            removeStoredHireIfCurrent(activeHireStorageKey, pollingHireId);
          setPollingHireId(null);
          return;
        }
      } catch (cause) {
        if (!cancelled && attempt === billingPlanHirePollDelays.length - 1)
          setError(errorMessage(cause));
      }
      if (attempt + 1 < billingPlanHirePollDelays.length)
        timer = window.setTimeout(
          () => void poll(attempt + 1),
          billingPlanHirePollDelays[attempt + 1],
        );
      else if (!cancelled) setPollingIndeterminate(true);
    };
    void poll(0);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [activeHireStorageKey, billingApi, loadOverview, pollingHireId]);

  const createHire = async (plan: BillingPlan) => {
    const generation = ++actionGeneration.current;
    setSubmitting(true);
    setError(null);
    try {
      const nextHire = await billingApi.createPlanHire({
        billingTypes: ["CREDIT_CARD"],
        idempotencyKey: createIdempotencyKey(plan.id),
        planId: plan.id,
      });
      if (generation !== actionGeneration.current) return;
      setHire(nextHire);
      if (!isBillingPlanHireTerminal(nextHire) && activeHireStorageKey) {
        storeActiveHire(activeHireStorageKey, nextHire.id);
        setPollingHireId(nextHire.id);
      }
      if (nextHire.checkoutUrl) {
        redirectToCheckout(nextHire.checkoutUrl);
      } else if (nextHire.status === "paid_active") {
        await loadOverview();
      }
    } catch (cause) {
      if (generation === actionGeneration.current)
        setError(errorMessage(cause));
    } finally {
      if (generation === actionGeneration.current) setSubmitting(false);
    }
  };

  const requestQuote = async (plan: BillingPlan) => {
    const generation = ++actionGeneration.current;
    setQuoteRequesting(true);
    setError(null);
    try {
      await billingApi.requestPlanQuote(plan.id);
      if (generation !== actionGeneration.current) return;
      setQuoteRequested(true);
    } catch (cause) {
      if (generation === actionGeneration.current)
        setError(errorMessage(cause));
    } finally {
      if (generation === actionGeneration.current) setQuoteRequesting(false);
    }
  };

  return (
    <FeaturePageShell className="billing-shell" variant="content">
      {error ? (
        <FeatureAlert className="billing-alert">{error}</FeatureAlert>
      ) : null}
      {providerError ? (
        <FeatureAlert className="billing-alert" tone="warning">
          O resumo continua disponível, mas não foi possível verificar o
          checkout. Atualize a página antes de contratar.
        </FeatureAlert>
      ) : null}
      {checkoutReturn ? (
        <FeatureAlert
          className="billing-alert"
          title={checkoutReturn.title}
          tone={checkoutReturn.tone}
        >
          {checkoutReturn.message}
        </FeatureAlert>
      ) : null}
      {pollingIndeterminate ? (
        <FeatureAlert
          className="billing-alert"
          title="Confirmação ainda em andamento"
          tone="warning"
        >
          Não recebemos um estado final. Seu plano atual continua válido;
          atualize mais tarde ou informe a contratação {pollingHireId} ao
          suporte. Não inicie outra contratação enquanto este estado estiver
          pendente.
        </FeatureAlert>
      ) : null}
      {quoteRequested ? (
        <FeatureAlert
          className="billing-alert"
          title="Proposta solicitada"
          tone="success"
        >
          Nossa equipe poderá preparar uma proposta versionada para o Escala.
          Nenhum checkout foi criado.
        </FeatureAlert>
      ) : null}
      {!overview && !error ? (
        <FeatureLoadingState title="Carregando faturamento">
          Consultando seu contrato efetivo e o catálogo de planos.
        </FeatureLoadingState>
      ) : null}
      {overview ? (
        <div className="space-y-6">
          <div
            className="flex items-center gap-2 border-b border-line pb-1"
            role="tablist"
          >
            <Tab
              active={activeTab === "subscription"}
              icon={Sparkles}
              label="Assinatura"
              onClick={() => setActiveTab("subscription")}
            />
            <Tab
              active={activeTab === "details"}
              icon={Receipt}
              label="Detalhes"
              onClick={() => setActiveTab("details")}
            />
          </div>
          {activeTab === "subscription" ? (
            <BillingSignupFlow
              canManage={overview.authority.currentActorCanManage}
              activationInProgress={Boolean(pollingHireId)}
              hire={hire}
              onPlanHire={createHire}
              onPlanSelect={setSelectedPlanId}
              onQuoteRequest={requestQuote}
              overview={overview}
              providerStatus={providerStatus}
              quoteRequesting={quoteRequesting}
              selectedPlanId={selectedPlanId}
              submitting={submitting}
            />
          ) : (
            <div className="space-y-6 px-2 pb-8 md:px-4">
              <BillingKpiGrid overview={overview} />
              <BillingAutomaticBillingPanel overview={overview} />
              <BillingAllocationTable allocations={overview.allocations} />
              <BillingEventList events={overview.entitlementEvents} />
            </div>
          )}
        </div>
      ) : null}
    </FeaturePageShell>
  );
}

function Tab({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof Sparkles;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-selected={active}
      className={cn(
        "flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-bold",
        active
          ? "border-accent-strong text-foreground"
          : "border-transparent text-muted",
      )}
      onClick={onClick}
      role="tab"
      type="button"
    >
      <Icon aria-hidden="true" className="size-4" />
      {label}
    </button>
  );
}

function createRuntimeBillingApi(): BillingApi {
  const invoke = async () => createBillingApi(await createBillingApiOptions());
  return {
    createPlanHire: async (input) => (await invoke()).createPlanHire(input),
    getPlanHire: async (hireId) => (await invoke()).getPlanHire(hireId),
    getOverview: async () => (await invoke()).getOverview(),
    getProviderStatus: async () => (await invoke()).getProviderStatus(),
    requestPlanQuote: async (planId) =>
      (await invoke()).requestPlanQuote(planId),
  };
}

function readReturnedHireId(storageKey: string) {
  if (typeof window === "undefined") return { callback: null, stored: null };
  let stored: string | null = null;
  let legacy: string | null = null;
  try {
    stored = window.sessionStorage.getItem(storageKey);
    legacy = window.sessionStorage.getItem(legacyActiveHireStorageKey);
  } catch {
    // Storage can be unavailable in hardened browser contexts.
  }
  const callback = new URLSearchParams(window.location.search).get("hireId");
  if (!stored && callback && legacy === callback) {
    storeActiveHire(storageKey, legacy);
    stored = legacy;
  }
  if (legacy) removeStoredHireIfCurrent(legacyActiveHireStorageKey, legacy);
  return { callback, stored };
}

function readTrustedReturnedHireId(storageKey: string) {
  const hireIds = readReturnedHireId(storageKey);
  return trustedBillingPlanHireId({
    callbackHireId: hireIds.callback,
    storedHireId: hireIds.stored,
  });
}

function scopedActiveHireStorageKey(tenantId: string, storeId: string) {
  return `lojaveiculos.billing.active-hire.${tenantId}.${storeId}`;
}

function createIdempotencyKey(planId: string) {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `web-${planId}-${random}`;
}

function removeStoredHireIfCurrent(storageKey: string, hireId: string) {
  try {
    if (window.sessionStorage.getItem(storageKey) === hireId) {
      window.sessionStorage.removeItem(storageKey);
    }
  } catch {
    // The server remains authoritative if browser storage becomes unavailable.
  }
}

function storeActiveHire(storageKey: string, hireId: string) {
  try {
    window.sessionStorage.setItem(storageKey, hireId);
  } catch {
    // Polling in the active page still works without browser storage.
  }
}

function errorMessage(error: unknown) {
  const message = formatApiErrorDisplay(
    error,
    "Não foi possível concluir a operação de faturamento.",
  );
  return `${message} Tente novamente; se persistir, informe o ID do erro ou da contratação ao suporte.`;
}
