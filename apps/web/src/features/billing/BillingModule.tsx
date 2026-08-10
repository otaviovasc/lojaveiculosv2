import { useEffect, useMemo, useState } from "react";
import { FeaturePageShell } from "../../components/ui/FeatureLayout";
import { FeatureAlert } from "../../components/ui/FeatureStates";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { cn } from "../../lib/utils";
import { Receipt, Sparkles } from "lucide-react";
import "../../styles/billing-composition.css";
import "../../styles/billing-panels.css";
import "../../styles/billing-upgrade.css";
import { createBillingApi, type BillingApi } from "./apiClient";
import { BillingAutomaticBillingPanel } from "./BillingAutomaticBillingPanel";
import {
  readBillingCheckoutReturn,
  redirectToCheckout,
} from "./billingCheckoutReturn";
import type { BillingCheckoutState } from "./BillingCheckoutPanel";
import {
  BillingAllocationTable,
  BillingEventList,
  BillingKpiGrid,
} from "./BillingPanels";
import { BillingSignupFlow } from "./BillingSignupFlow";
import { createBillingApiOptions } from "./runtimeApi";
import type { BillingOverview, BillingProviderStatus } from "./types";

export function BillingModule({ api }: { api?: BillingApi }) {
  const billingApi = useMemo(() => api ?? createRuntimeBillingApi(), [api]);
  const [overview, setOverview] = useState<BillingOverview | null>(null);
  const [providerStatus, setProviderStatus] =
    useState<BillingProviderStatus | null>(null);
  const [status, setStatus] = useState<BillingStatus>({ kind: "loading" });
  const [checkoutState, setCheckoutState] = useState<BillingCheckoutState>({
    kind: "idle",
  });
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

  const canManage = overview?.authority.currentActorCanManage ?? false;
  const [activeTab, setActiveTab] = useState<"subscription" | "details">(
    "subscription",
  );

  return (
    <FeaturePageShell className="billing-shell" variant="content">
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
        <div className="space-y-6">
          <div
            className="flex items-center gap-2 border-b border-line pb-1"
            role="tablist"
          >
            <button
              aria-selected={activeTab === "subscription"}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-all",
                activeTab === "subscription"
                  ? "border-accent-strong text-foreground"
                  : "border-transparent text-muted hover:text-foreground",
              )}
              onClick={() => setActiveTab("subscription")}
              role="tab"
              type="button"
            >
              <Sparkles
                className="size-4 text-accent-strong"
                aria-hidden="true"
              />
              Assinatura
            </button>
            <button
              aria-selected={activeTab === "details"}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-sm font-bold border-b-2 transition-all",
                activeTab === "details"
                  ? "border-accent-strong text-foreground"
                  : "border-transparent text-muted hover:text-foreground",
              )}
              onClick={() => setActiveTab("details")}
              role="tab"
              type="button"
            >
              <Receipt
                className="size-4 text-accent-strong"
                aria-hidden="true"
              />
              Detalhes
            </button>
          </div>

          {activeTab === "subscription" ? (
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
          ) : (
            <div className="billing-details-workspace relative space-y-6 px-2 pb-8 md:px-4">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute right-1/4 top-0 h-[300px] w-[500px] rounded-full bg-accent-strong/15 blur-[120px]"
              />
              <header className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-line/70 pb-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent-soft px-3.5 py-1 text-xs font-extrabold text-accent-strong">
                  <Receipt aria-hidden="true" className="size-3.5" />
                  Detalhes da assinatura
                </span>
              </header>
              <div className="relative z-10 space-y-6">
                <BillingKpiGrid overview={overview} />
                <BillingAutomaticBillingPanel overview={overview} />
                <BillingAllocationTable allocations={overview.allocations} />
                <BillingEventList events={overview.entitlementEvents} />
              </div>
            </div>
          )}
        </div>
      ) : null}
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
    "Não foi possível carregar o faturamento.",
  );
}
