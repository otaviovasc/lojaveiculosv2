import { CreditCard, RefreshCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FeatureActionButton,
  FeaturePageHeader,
  FeaturePageShell,
} from "../../../components/ui/FeatureLayout";
import {
  FeatureAlert,
  FeatureLoadingState,
} from "../../../components/ui/FeatureStates";
import { FeatureTabs } from "../../../components/ui/FeatureTabs";
import { BillingAutomaticBillingPanel } from "../../billing/BillingAutomaticBillingPanel";
import { readBillingCheckoutReturn } from "../../billing/billingCheckoutReturn";
import {
  billingPlanHirePollDelays,
  isBillingPlanHireTerminal,
  trustedBillingPlanHireId,
} from "../../billing/billingPlanHireState";
import { BillingEventList } from "../../billing/BillingPanels";
import { BillingSignupFlow } from "../../billing/BillingSignupFlow";
import type {
  BillingPlan,
  BillingPlanHire,
  BillingProviderStatus,
} from "../../billing/types";
import type { AgencyApi, AgencyTenantOverview } from "../apiClient";
import {
  AgencyTenantSelector,
  useAgencyTenantSelection,
} from "../useAgencyTenantSelection";
import {
  agencyBillingErrorMessage,
  createAgencyBillingPanelOverview,
  type AgencyBillingTab,
} from "./AgencyBillingPage.model";
import { createRuntimeAgencyBillingApi } from "./AgencyBillingPage.runtime";
import { AgencyBillingStoreEntitlements } from "./AgencyBillingStoreEntitlements";
import { AgencyBillingAllocation } from "./AgencyBillingSummarySections";

export function AgencyBillingPage({ api }: { api?: AgencyApi }) {
  const requestGeneration = useRef(0);
  const actionGeneration = useRef(0);
  const planHireIdempotencyFallback = useRef(new Map<string, string>());
  const { agencyTenant, agencyTenants, selectAgencyTenant } =
    useAgencyTenantSelection();
  const [searchParams, setSearchParams] = useSearchParams();
  const [overview, setOverview] = useState<AgencyTenantOverview | null>(null);
  const [providerStatus, setProviderStatus] =
    useState<BillingProviderStatus | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(() =>
    searchParams.get("storeId"),
  );
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AgencyBillingTab>("overview");
  const [error, setError] = useState<string | null>(null);
  const [providerError, setProviderError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hire, setHire] = useState<BillingPlanHire | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [quoteRequesting, setQuoteRequesting] = useState(false);
  const [quoteRequested, setQuoteRequested] = useState(false);
  const [pollingHireId, setPollingHireId] = useState<string | null>(null);
  const [pollingIndeterminate, setPollingIndeterminate] = useState(false);
  const checkoutReturn = readBillingCheckoutReturn("agency");

  const refresh = useCallback(async () => {
    const generation = ++requestGeneration.current;
    if (!agencyTenant) {
      setError("Nenhum tenant de agência ativo foi encontrado.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setProviderError(false);
    setOverview(null);
    setProviderStatus(null);
    let billingApi: AgencyApi;
    try {
      billingApi = api ?? (await createRuntimeAgencyBillingApi());
    } catch (cause) {
      if (generation === requestGeneration.current) {
        setError(agencyBillingErrorMessage(cause));
        setLoading(false);
      }
      return;
    }
    try {
      const nextOverview = await billingApi.getOverview(agencyTenant.tenantId);
      if (generation !== requestGeneration.current) return;
      setOverview(nextOverview);
      setSelectedStoreId((current) =>
        nextOverview.stores.some((store) => store.storeId === current)
          ? current
          : (nextOverview.stores[0]?.storeId ?? null),
      );
    } catch (cause) {
      if (generation === requestGeneration.current)
        setError(agencyBillingErrorMessage(cause));
    } finally {
      if (generation === requestGeneration.current) setLoading(false);
    }
    try {
      const status = await billingApi.getProviderStatus(agencyTenant.tenantId);
      if (generation === requestGeneration.current) setProviderStatus(status);
    } catch {
      if (generation === requestGeneration.current) setProviderError(true);
    }
  }, [agencyTenant, api]);

  useEffect(() => {
    void refresh();
    return () => {
      requestGeneration.current += 1;
    };
  }, [refresh]);

  const panelOverview = useMemo(
    () => createAgencyBillingPanelOverview(overview, selectedStoreId),
    [overview, selectedStoreId],
  );

  useEffect(() => {
    if (!overview || !selectedStoreId) return;
    const store = overview.stores.find(
      (candidate) => candidate.storeId === selectedStoreId,
    );
    setSelectedPlanId(
      overview.plans.find((plan) => plan.code === store?.planCode)?.id ??
        overview.plans.find((plan) => plan.code === "free")?.id ??
        null,
    );
  }, [overview, selectedStoreId]);

  useEffect(() => {
    actionGeneration.current += 1;
    setHire(null);
    setPollingIndeterminate(false);
    setSubmitting(false);
    setQuoteRequesting(false);
    setQuoteRequested(false);
    setPollingHireId(
      agencyTenant && selectedStoreId
        ? readTrustedAgencyHireId(agencyTenant.tenantId, selectedStoreId)
        : null,
    );
  }, [agencyTenant, selectedStoreId]);

  const selectStore = (storeId: string) => {
    actionGeneration.current += 1;
    setSelectedStoreId(storeId);
    const next = new URLSearchParams(searchParams);
    next.set("storeId", storeId);
    setSearchParams(next, { replace: true });
  };

  const createHire = async (plan: BillingPlan) => {
    if (!agencyTenant || !selectedStoreId) return;
    const tenantId = agencyTenant.tenantId;
    const storeId = selectedStoreId;
    const idempotencyKey = readOrCreateAgencyPlanIdempotencyKey(
      tenantId,
      storeId,
      plan.id,
      planHireIdempotencyFallback.current,
    );
    const generation = ++actionGeneration.current;
    setSubmitting(true);
    setError(null);
    try {
      const billingApi = api ?? (await createRuntimeAgencyBillingApi());
      const nextHire = await billingApi.createStorePlanHire(tenantId, storeId, {
        billingTypes: ["CREDIT_CARD"],
        idempotencyKey,
        planId: plan.id,
      });
      if (generation !== actionGeneration.current) return;
      if (
        nextHire.tenantId !== tenantId ||
        nextHire.storeId !== storeId ||
        nextHire.planId !== plan.id
      ) {
        clearAgencyPlanIdempotencyKey(
          tenantId,
          storeId,
          plan.id,
          planHireIdempotencyFallback.current,
        );
        throw new Error(
          "A contratação retornada não corresponde ao plano e à loja selecionados.",
        );
      }
      setHire(nextHire);
      if (isBillingPlanHireTerminal(nextHire))
        clearAgencyPlanIdempotencyKey(
          tenantId,
          storeId,
          plan.id,
          planHireIdempotencyFallback.current,
        );
      if (!isBillingPlanHireTerminal(nextHire)) {
        storeAgencyHire(hireStorageKey(tenantId, storeId), nextHire.id);
        setPollingHireId(nextHire.id);
      }
      if (nextHire.checkoutUrl) {
        window.location.assign(nextHire.checkoutUrl);
      } else if (nextHire.status === "paid_active") await refresh();
    } catch (cause) {
      if (generation === actionGeneration.current)
        setError(agencyBillingErrorMessage(cause));
    } finally {
      if (generation === actionGeneration.current) setSubmitting(false);
    }
  };

  const requestQuote = async (plan: BillingPlan) => {
    if (!agencyTenant || !selectedStoreId || quoteRequested || quoteRequesting)
      return;
    const tenantId = agencyTenant.tenantId;
    const storeId = selectedStoreId;
    const generation = ++actionGeneration.current;
    setQuoteRequesting(true);
    setError(null);
    try {
      const billingApi = api ?? (await createRuntimeAgencyBillingApi());
      await billingApi.requestStorePlanQuote(tenantId, storeId, plan.id);
      if (generation !== actionGeneration.current) return;
      setQuoteRequested(true);
    } catch (cause) {
      if (generation === actionGeneration.current)
        setError(agencyBillingErrorMessage(cause));
    } finally {
      if (generation === actionGeneration.current) setQuoteRequesting(false);
    }
  };

  useEffect(() => {
    if (!agencyTenant || !selectedStoreId || !pollingHireId) return;
    const tenantId = agencyTenant.tenantId;
    const storeId = selectedStoreId;
    let cancelled = false;
    let timer: number | undefined;
    let attempt = 0;
    setPollingIndeterminate(false);
    const poll = async () => {
      try {
        const billingApi = api ?? (await createRuntimeAgencyBillingApi());
        const next = await billingApi.getStorePlanHire(
          tenantId,
          storeId,
          pollingHireId,
        );
        if (cancelled) return;
        if (next.tenantId !== tenantId || next.storeId !== storeId) {
          removeAgencyHireIfCurrent(
            hireStorageKey(tenantId, storeId),
            pollingHireId,
          );
          setPollingHireId(null);
          setError(
            "A contratação retornada não pertence à loja selecionada. Tente novamente; se persistir, informe o ID da contratação ao suporte.",
          );
          return;
        }
        setHire(next);
        if (isBillingPlanHireTerminal(next)) {
          clearAgencyPlanIdempotencyKey(
            tenantId,
            storeId,
            next.planId,
            planHireIdempotencyFallback.current,
          );
          removeAgencyHireIfCurrent(
            hireStorageKey(tenantId, storeId),
            pollingHireId,
          );
          setPollingHireId(null);
          if (next.status === "paid_active") {
            await refresh();
            if (cancelled) return;
          }
          return;
        }
      } catch (cause) {
        if (attempt === billingPlanHirePollDelays.length - 1 && !cancelled)
          setError(agencyBillingErrorMessage(cause));
      }
      attempt += 1;
      if (attempt < billingPlanHirePollDelays.length)
        timer = window.setTimeout(
          () => void poll(),
          billingPlanHirePollDelays[attempt],
        );
      else if (!cancelled) setPollingIndeterminate(true);
    };
    void poll();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [agencyTenant, api, pollingHireId, refresh, selectedStoreId]);

  return (
    <FeaturePageShell className="billing-shell" variant="content">
      <FeaturePageHeader
        actions={
          <>
            <AgencyTenantSelector
              agencyTenant={agencyTenant}
              agencyTenants={agencyTenants}
              onChange={selectAgencyTenant}
            />
            <FeatureActionButton
              icon={RefreshCcw}
              isBusy={loading}
              label="Atualizar"
              onClick={() => void refresh()}
            />
          </>
        }
        description="Contratos efetivos e planos cumulativos por loja, sem adicionais."
        eyebrow={
          <>
            <CreditCard aria-hidden="true" className="size-4" />
            Plano do grupo
          </>
        }
        title="Planos das lojas"
      />
      {error ? (
        <FeatureAlert className="billing-alert">{error}</FeatureAlert>
      ) : null}
      {providerError ? (
        <FeatureAlert className="billing-alert" tone="warning">
          O resumo segue disponível, mas a prontidão do checkout não pôde ser
          verificada.
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
      {quoteRequested ? (
        <FeatureAlert
          className="billing-alert"
          title="Proposta solicitada"
          tone="success"
        >
          A solicitação do Escala foi registrada para esta loja. Nenhum checkout
          foi criado.
        </FeatureAlert>
      ) : null}
      {pollingIndeterminate ? (
        <FeatureAlert
          className="billing-alert"
          title="Confirmação ainda em andamento"
          tone="warning"
        >
          Não recebemos um estado final para a contratação {pollingHireId}. O
          contrato efetivo atual segue válido. Atualize mais tarde ou informe o
          ID ao suporte antes de iniciar outra contratação.
        </FeatureAlert>
      ) : null}
      {overview && panelOverview ? (
        <>
          <AgencyBillingStoreEntitlements
            onStoreChange={selectStore}
            overview={overview}
            selectedStoreId={selectedStoreId}
          />
          <FeatureTabs
            ariaLabel="Seções do plano do grupo"
            className="billing-tabs"
            onChange={setActiveTab}
            options={[
              { label: "Plano", value: "overview" },
              { label: "Cobrança", value: "billing" },
              { label: "Histórico", value: "history" },
            ]}
            value={activeTab}
          />
          {activeTab === "overview" ? (
            <>
              <BillingSignupFlow
                activationInProgress={Boolean(pollingHireId)}
                canManage={overview.authority.currentActorCanManage}
                hire={hire}
                onPlanHire={createHire}
                onPlanSelect={setSelectedPlanId}
                onQuoteRequest={requestQuote}
                overview={panelOverview}
                providerStatus={providerStatus}
                quoteRequested={quoteRequested}
                quoteRequesting={quoteRequesting}
                selectedPlanId={selectedPlanId}
                submitting={submitting}
              />
              <AgencyBillingAllocation overview={overview} />
            </>
          ) : null}
          {activeTab === "billing" ? (
            <BillingAutomaticBillingPanel overview={panelOverview} />
          ) : null}
          {activeTab === "history" ? (
            <BillingEventList events={overview.entitlementEvents} />
          ) : null}
        </>
      ) : loading ? (
        <FeatureLoadingState title="Carregando cobrança da agência">
          Consultando contratos efetivos das lojas.
        </FeatureLoadingState>
      ) : null}
    </FeaturePageShell>
  );
}

function hireStorageKey(tenantId: string, storeId: string) {
  return `lojaveiculos.agency.billing.hire.${tenantId}.${storeId}`;
}

function readTrustedAgencyHireId(tenantId: string, storeId: string) {
  let storedHireId: string | null = null;
  try {
    storedHireId = window.sessionStorage.getItem(
      hireStorageKey(tenantId, storeId),
    );
  } catch {
    // Storage can be unavailable in hardened browser contexts.
  }
  return trustedBillingPlanHireId({
    callbackHireId: new URLSearchParams(window.location.search).get("hireId"),
    storedHireId,
  });
}

function storeAgencyHire(storageKey: string, hireId: string) {
  try {
    window.sessionStorage.setItem(storageKey, hireId);
  } catch {
    // Polling in the active page still works without browser storage.
  }
}

function removeAgencyHireIfCurrent(storageKey: string, hireId: string) {
  try {
    if (window.sessionStorage.getItem(storageKey) === hireId) {
      window.sessionStorage.removeItem(storageKey);
    }
  } catch {
    // The server remains authoritative if browser storage becomes unavailable.
  }
}
function createIdempotencyKey(planId: string) {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `agency-${planId}-${random}`;
}

function agencyPlanIdempotencyStorageKey(
  tenantId: string,
  storeId: string,
  planId: string,
) {
  return `lojaveiculos.agency.billing.plan-hire-idempotency.${tenantId}.${storeId}.${planId}`;
}

function readOrCreateAgencyPlanIdempotencyKey(
  tenantId: string,
  storeId: string,
  planId: string,
  fallback: Map<string, string>,
) {
  const storageKey = agencyPlanIdempotencyStorageKey(tenantId, storeId, planId);
  try {
    const stored = window.sessionStorage.getItem(storageKey);
    if (stored) {
      fallback.set(storageKey, stored);
      return stored;
    }
    const fallbackKey = fallback.get(storageKey);
    if (fallbackKey) return fallbackKey;
    const created = createIdempotencyKey(planId);
    window.sessionStorage.setItem(storageKey, created);
    fallback.set(storageKey, created);
    return created;
  } catch {
    const stored = fallback.get(storageKey);
    if (stored) return stored;
    const created = createIdempotencyKey(planId);
    fallback.set(storageKey, created);
    return created;
  }
}

function clearAgencyPlanIdempotencyKey(
  tenantId: string,
  storeId: string,
  planId: string,
  fallback: Map<string, string>,
) {
  const storageKey = agencyPlanIdempotencyStorageKey(tenantId, storeId, planId);
  fallback.delete(storageKey);
  try {
    window.sessionStorage.removeItem(storageKey);
  } catch {
    // The server remains authoritative if browser storage becomes unavailable.
  }
}
