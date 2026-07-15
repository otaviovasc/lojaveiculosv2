import { CreditCard, RefreshCcw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  FeatureActionButton,
  FeaturePageHeader,
  FeaturePageShell,
} from "../../components/ui/FeatureLayout";
import {
  FeatureAlert,
  FeatureEmptyState,
} from "../../components/ui/FeatureStates";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { createBillingApi, type BillingApi } from "./apiClient";
import { readBillingCheckoutReturn } from "./billingCheckoutReturn";
import { BillingTabs, type BillingTab } from "./BillingNavigation";
import { BillingAutomaticBillingPanel } from "./BillingAutomaticBillingPanel";
import { BillingTrialStatus } from "./BillingTrialStatus";
import {
  BillingCheckoutPanel,
  type BillingCheckoutState,
} from "./BillingCheckoutPanel";
import {
  BillingAllocationTable,
  BillingEventList,
  BillingKpiGrid,
  BillingPlanComposition,
} from "./BillingPanels";
import { createBillingApiOptions } from "./runtimeApi";
import type {
  BillingEntitlementStatus,
  BillingOverview,
  BillingProviderStatus,
  EntitlementKey,
} from "./types";

export function BillingModule({ api }: { api?: BillingApi }) {
  const billingApi = useMemo(() => api ?? createRuntimeBillingApi(), [api]);
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [providerStatus, setProviderStatus] =
    useState<BillingProviderStatus | null>(null);
  const [status, setStatus] = useState<BillingStatus>({ kind: "loading" });
  const [activeTab, setActiveTab] = useState<BillingTab>("overview");
  const [checkoutState, setCheckoutState] = useState<BillingCheckoutState>({
    kind: "idle",
  });
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [selectionSaving, setSelectionSaving] = useState(false);
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

  const updateEntitlement = async (
    featureKey: EntitlementKey,
    nextStatus: BillingEntitlementStatus,
  ) => {
    setStatus({ kind: "saving", featureKey });
    try {
      const reason = reasons[featureKey]?.trim() || defaultReason(nextStatus);
      setOverview(
        await billingApi.updateEntitlement(featureKey, {
          featureKey,
          metadata: { updatedFrom: "billing_admin_console" },
          reason,
          status: nextStatus,
        }),
      );
      setReasons((current) => ({ ...current, [featureKey]: "" }));
      setStatus({ kind: "saved" });
    } catch (error) {
      setStatus({ kind: "error", message: errorMessage(error) });
    }
  };

  const startCheckout: BillingApi["createCheckout"] = async (input) => {
    setCheckoutState({ kind: "starting" });
    try {
      await saveSelection();
      const checkout = await billingApi.createCheckout(input);
      setCheckoutState({ kind: "started" });
      window.location.assign(checkout.checkoutUrl);
      return checkout;
    } catch (error) {
      setCheckoutState({ kind: "idle" });
      setStatus({ kind: "error", message: errorMessage(error) });
      throw error;
    }
  };

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
          <BillingTrialStatus overview={overview} />
          <BillingTabs activeTab={activeTab} onChange={setActiveTab} />
          {activeTab === "overview" ? (
            <>
              <BillingPlanComposition
                canManage={overview.authority.currentActorCanManage}
                overview={overview}
                reasons={reasons}
                savingFeatureKey={
                  status.kind === "saving" ? status.featureKey : null
                }
                onReasonChange={(featureKey, reason) =>
                  setReasons((current) => ({
                    ...current,
                    [featureKey]: reason,
                  }))
                }
                onUpdate={updateEntitlement}
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
                onSaveSelection={saveSelection}
              />
              <BillingKpiGrid overview={overview} />
            </>
          ) : null}
          {activeTab === "billing" ? (
            <>
              {canStartSubscription(overview) ? (
                <BillingCheckoutPanel
                  checkoutState={checkoutState}
                  overview={overview}
                  providerStatus={providerStatus}
                  selectedAddonIds={selectedAddonIds}
                  selectedPlanId={selectedPlanId}
                  onCheckout={startCheckout}
                />
              ) : null}
              {isPaidSubscription(overview) ? (
                <BillingAutomaticBillingPanel overview={overview} />
              ) : null}
              <BillingAllocationTable allocations={overview.allocations} />
            </>
          ) : null}
          {activeTab === "history" ? (
            <>
              <BillingEventList events={overview.entitlementEvents} />
            </>
          ) : null}
        </>
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

function canStartSubscription(overview: BillingOverview) {
  const status = overview.subscription?.status;
  return (
    !status ||
    status === "cancelled" ||
    status === "expired" ||
    status === "trialing"
  );
}

function isPaidSubscription(overview: BillingOverview) {
  return (
    overview.subscription?.status === "active" ||
    overview.subscription?.status === "past_due"
  );
}

type BillingStatus =
  | { kind: "error"; message: string }
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "saved" }
  | { featureKey: EntitlementKey; kind: "saving" };

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

function defaultReason(status: BillingEntitlementStatus) {
  return status === "active"
    ? "Entitlement enabled from billing console."
    : "Entitlement changed from billing console.";
}

function errorMessage(error: unknown) {
  return formatApiErrorDisplay(
    error,
    "Nao foi possivel carregar o faturamento.",
  );
}
