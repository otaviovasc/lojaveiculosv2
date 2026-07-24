import { CreditCard, RefreshCcw, Sparkles, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FeatureActionButton,
  FeaturePageHeader,
  FeaturePageShell,
} from "../../components/ui/FeatureLayout";
import {
  FeatureAlert,
  FeatureEmptyState,
} from "../../components/ui/FeatureStates";
import { FeatureTabs } from "../../components/ui/FeatureTabs";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { createBillingApi, type BillingApi } from "./apiClient";
import {
  readBillingCheckoutReturn,
  redirectToCheckout,
} from "./billingCheckoutReturn";
import { BillingAutomaticBillingPanel } from "./BillingAutomaticBillingPanel";
import type { BillingCheckoutState } from "./BillingCheckoutPanel";
import { BillingSignupFlow } from "./BillingSignupFlow";
import { BillingTrialStatus } from "./BillingTrialStatus";
import {
  BillingAllocationTable,
  BillingEventList,
  BillingKpiGrid,
} from "./BillingPanels";
import { createBillingApiOptions } from "./runtimeApi";
import type { BillingOverview, BillingProviderStatus } from "./types";

type BillingPageTab = "assinatura" | "detalhes";

export function BillingModule({ api }: { api?: BillingApi }) {
  const billingApi = useMemo(() => api ?? createRuntimeBillingApi(), [api]);
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [providerStatus, setProviderStatus] =
    useState<BillingProviderStatus | null>(null);
  const [status, setStatus] = useState<BillingStatus>({ kind: "loading" });
  const [activeTab, setActiveTab] = useState<BillingPageTab>("assinatura");
  const [checkoutState, setCheckoutState] = useState<BillingCheckoutState>({
    kind: "idle",
  });
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [selectionSaving, setSelectionSaving] = useState(false);
  const signupRef = useRef<HTMLDivElement | null>(null);
  const [signupScrollSignal, setSignupScrollSignal] = useState(0);
  const checkoutReturn = readBillingCheckoutReturn("store");

  const refresh = async () => {
    setStatus({ kind: "loading" });
    try {
      const [nextOverview, nextProviderStatus] = await Promise.all([
        billingApi.getOverview(),
        billingApi.getProviderStatus(),
      ]);
      setOverview(nextOverview);
      setSelectedPlanId(nextOverview.subscription?.plan?.id ?? null);
      setSelectedAddonIds(
        nextOverview.chargePreview.lineItems.flatMap((item) =>
          item.itemType === "addon" && item.sourceId ? [item.sourceId] : [],
        ),
      );
      setProviderStatus(nextProviderStatus);
      setStatus({ kind: "ready" });
    } catch (error) {
      setStatus({ kind: "error", message: errorMessage(error) });
    }
  };

  const saveSelection = async () => {
    if (!selectedPlanId) throw new Error("Selecione um plano.");
    setSelectionSaving(true);
    try {
      const paidSubscription = overview ? isPaidSubscription(overview) : false;
      const nextOverview = await billingApi.updateSelection({
        addonIds: selectedAddonIds,
        planId: selectedPlanId,
      });
      if (paidSubscription) {
        await billingApi.syncProviderSubscription({
          billingType: "CREDIT_CARD",
          ...(overview?.subscription?.currentPeriodEnd
            ? {
                nextDueDate: overview.subscription.currentPeriodEnd.slice(
                  0,
                  10,
                ),
              }
            : {}),
          updatePendingPayments: false,
        });
        setOverview(await billingApi.getOverview());
      } else {
        setOverview(nextOverview);
      }
    } catch (error) {
      setStatus({ kind: "error", message: errorMessage(error) });
      throw error;
    } finally {
      setSelectionSaving(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (signupScrollSignal > 0) {
      signupRef.current?.scrollIntoView?.({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [signupScrollSignal]);

  const startCheckout: BillingApi["createCheckout"] = async (input) => {
    setCheckoutState({ kind: "starting" });
    try {
      await saveSelection();
      const checkout = await billingApi.createCheckout(input);
      setCheckoutState({ kind: "started" });
      redirectToCheckout(checkout.checkoutUrl);
      return checkout;
    } catch (error) {
      setCheckoutState({ kind: "idle" });
      setStatus({ kind: "error", message: errorMessage(error) });
      throw error;
    }
  };

  const goToSignup = () => {
    setActiveTab("assinatura");
    setSignupScrollSignal((current) => current + 1);
  };

  const canManage = overview?.authority.currentActorCanManage ?? false;

  return (
    <FeaturePageShell className="billing-shell" variant="content">
      <FeaturePageHeader
        actions={
          <FeatureActionButton
            icon={RefreshCcw}
            label="Atualizar"
            onClick={() => void refresh()}
          />
        }
        description={
          "Tenha a base certa para vender mais e adicione novas capacidades no ritmo da sua operação."
        }
        eyebrow={
          <>
            <CreditCard aria-hidden="true" className="size-4" />
            Assinatura
          </>
        }
        title="Seu plano Loja Veículos"
      />

      {status.kind === "error" ? (
        <FeatureAlert className="billing-alert">{status.message}</FeatureAlert>
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

      {overview ? (
        <>
          <BillingTrialStatus
            overview={overview}
            onCta={canManage ? goToSignup : undefined}
          />
          <BillingKpiGrid overview={overview} />
          <FeatureTabs
            ariaLabel="Seções da assinatura"
            className="billing-tabs"
            onChange={setActiveTab}
            options={[
              { label: "Assinatura", value: "assinatura" },
              { label: "Detalhes", value: "detalhes" },
            ]}
            value={activeTab}
          />
          {activeTab === "assinatura" ? (
            <div ref={signupRef}>
              <BillingSignupFlow
                canManage={canManage}
                checkoutState={checkoutState}
                overview={overview}
                providerStatus={providerStatus}
                selectedAddonIds={selectedAddonIds}
                selectedPlanId={selectedPlanId}
                selectionSaving={selectionSaving}
                onAddonToggle={(addonId) =>
                  setSelectedAddonIds((current) =>
                    current.includes(addonId)
                      ? current.filter((id) => id !== addonId)
                      : [...current, addonId],
                  )
                }
                onPlanSelect={setSelectedPlanId}
                onSubscribe={startCheckout}
              />
            </div>
          ) : (
            <>
              {isPaidSubscription(overview) ? (
                <BillingAutomaticBillingPanel overview={overview} />
              ) : null}
              <BillingAllocationTable allocations={overview.allocations} />
              <BillingEventList events={overview.entitlementEvents} />
            </>
          )}
        </>
      ) : status.kind === "error" ? (
        <FeatureEmptyState
          action={
            <FeatureActionButton
              icon={RefreshCcw}
              label="Tentar novamente"
              onClick={() => void refresh()}
              variant="primary"
            />
          }
          body="Não foi possível sincronizar planos, pacotes e cobrança. Nenhuma cobrança foi feita."
          icon={TriangleAlert}
          title="Faturamento indisponível"
          tone="warning"
        />
      ) : (
        <FeatureEmptyState
          body="Sincronizando planos, add-ons e acesso efetivo por feature."
          icon={Sparkles}
          title="Carregando billing"
        />
      )}
    </FeaturePageShell>
  );
}

function isPaidSubscription(overview: BillingOverview) {
  return (
    overview.subscription?.status === "active" ||
    overview.subscription?.status === "past_due"
  );
}

type BillingStatus =
  { kind: "error"; message: string } | { kind: "loading" } | { kind: "ready" };

function createRuntimeBillingApi(): BillingApi {
  return {
    getOverview: async () =>
      createBillingApi(await createBillingApiOptions()).getOverview(),
    getProviderStatus: async () =>
      createBillingApi(await createBillingApiOptions()).getProviderStatus(),
    createCheckout: async (input) =>
      createBillingApi(await createBillingApiOptions()).createCheckout(input),
    updateEntitlement: async (featureKey, input) =>
      createBillingApi(await createBillingApiOptions()).updateEntitlement(
        featureKey,
        input,
      ),
    updateSelection: async (input) =>
      createBillingApi(await createBillingApiOptions()).updateSelection(input),
    syncProviderSubscription: async (input) =>
      createBillingApi(
        await createBillingApiOptions(),
      ).syncProviderSubscription(input),
  };
}

function errorMessage(error: unknown) {
  return formatApiErrorDisplay(
    error,
    "Nao foi possivel carregar o faturamento.",
  );
}
