import { CreditCard, RefreshCcw, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  FeatureActionButton,
  FeaturePageHeader,
  FeaturePageShell,
} from "../../../components/ui/FeatureLayout";
import {
  FeatureAlert,
  FeatureEmptyState,
} from "../../../components/ui/FeatureStates";
import { BillingEventList } from "../../billing/BillingPanels";
import { BillingAutomaticBillingPanel } from "../../billing/BillingAutomaticBillingPanel";
import { BillingTabs, type BillingTab } from "../../billing/BillingNavigation";
import { readBillingCheckoutReturn } from "../../billing/billingCheckoutReturn";
import type { BillingCheckoutState } from "../../billing/BillingCheckoutPanel";
import type {
  BillingEntitlementStatus,
  BillingProviderStatus,
  EntitlementKey,
} from "../../billing/types";
import { useAccountSession } from "../../account/accountSession";
import type { AgencyApi, AgencyTenantOverview } from "../apiClient";
import {
  agencyBillingDefaultReason,
  agencyBillingErrorMessage,
  createAgencyBillingPanelOverview,
  type AgencyBillingStatus,
} from "./AgencyBillingPage.model";
import { createRuntimeAgencyBillingApi } from "./AgencyBillingPage.runtime";
import { AgencyBillingStoreEntitlements } from "./AgencyBillingStoreEntitlements";
import {
  AgencyBillingAllocation,
  AgencyBillingStatusSummary,
} from "./AgencyBillingSummarySections";

export function AgencyBillingPage({ api }: { api?: AgencyApi }) {
  const session = useAccountSession();
  const agencyTenant = session.tenantMemberships.find(
    (membership) =>
      membership.role === "agency" && membership.status === "active",
  );
  const [overview, setOverview] = useState<AgencyTenantOverview | null>(null);
  const [providerStatus, setProviderStatus] =
    useState<BillingProviderStatus | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [status, setStatus] = useState<AgencyBillingStatus>({
    kind: "loading",
  });
  const [checkoutState, setCheckoutState] = useState<BillingCheckoutState>({
    kind: "idle",
  });
  const [activeTab, setActiveTab] = useState<BillingTab>("overview");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const checkoutReturn = readBillingCheckoutReturn("agency");

  const refresh = async () => {
    if (!agencyTenant) {
      setStatus({
        kind: "error",
        message: "Nenhum tenant de agencia ativo foi encontrado.",
      });
      return;
    }
    setStatus({ kind: "loading" });
    try {
      const billingApi = api ?? (await createRuntimeAgencyBillingApi());
      const [nextOverview, nextProviderStatus] = await Promise.all([
        billingApi.getOverview(agencyTenant.tenantId),
        billingApi.getProviderStatus(agencyTenant.tenantId),
      ]);
      setOverview(nextOverview);
      setProviderStatus(nextProviderStatus);
      setSelectedStoreId(
        (current) => current ?? nextOverview.stores[0]?.storeId ?? null,
      );
      setStatus({ kind: "ready" });
    } catch (error) {
      setStatus({ kind: "error", message: agencyBillingErrorMessage(error) });
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const panelOverview = useMemo(
    () => createAgencyBillingPanelOverview(overview, selectedStoreId),
    [overview, selectedStoreId],
  );

  const startCheckout: AgencyApi["createCheckout"] = async (
    tenantId,
    input,
  ) => {
    setCheckoutState({ kind: "starting" });
    try {
      const billingApi = api ?? (await createRuntimeAgencyBillingApi());
      const checkout = await billingApi.createCheckout(tenantId, input);
      setCheckoutState({ kind: "started" });
      window.location.assign(checkout.checkoutUrl);
      return checkout;
    } catch (error) {
      setCheckoutState({ kind: "idle" });
      setStatus({ kind: "error", message: agencyBillingErrorMessage(error) });
      throw error;
    }
  };

  const updateEntitlement = async (
    featureKey: EntitlementKey,
    nextStatus: BillingEntitlementStatus,
  ) => {
    if (!agencyTenant || !selectedStoreId) return;
    setStatus({ kind: "saving", featureKey });
    try {
      const billingApi = api ?? (await createRuntimeAgencyBillingApi());
      const reason =
        reasons[featureKey]?.trim() || agencyBillingDefaultReason(nextStatus);
      setOverview(
        await billingApi.updateStoreEntitlement(
          agencyTenant.tenantId,
          selectedStoreId,
          featureKey,
          {
            featureKey,
            metadata: { updatedFrom: "agency_billing_console" },
            reason,
            status: nextStatus,
          },
        ),
      );
      setReasons((current) => ({ ...current, [featureKey]: "" }));
      setStatus({ kind: "ready" });
    } catch (error) {
      setStatus({ kind: "error", message: agencyBillingErrorMessage(error) });
    }
  };

  return (
    <FeaturePageShell className="billing-shell" variant="content">
      <FeaturePageHeader
        actions={
          <FeatureActionButton
            icon={RefreshCcw}
            isBusy={status.kind === "loading"}
            label="Atualizar"
            onClick={() => void refresh()}
          />
        }
        description="Uma visão clara do investimento do grupo e dos pacotes que ajudam cada loja a crescer."
        eyebrow={
          <>
            <CreditCard aria-hidden="true" className="size-4" />
            Plano do grupo
          </>
        }
        title="Planos e crescimento das lojas"
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

      {overview && panelOverview ? (
        <>
          <AgencyBillingStatusSummary
            checkoutState={checkoutState}
            overview={overview}
            panelOverview={panelOverview}
            providerStatus={providerStatus}
            onCheckout={(input) =>
              agencyTenant
                ? startCheckout(agencyTenant.tenantId, input)
                : Promise.reject(new Error("Agency tenant not found."))
            }
          />
          <BillingTabs activeTab={activeTab} onChange={setActiveTab} />
          {activeTab === "overview" ? (
            <>
              <AgencyBillingStoreEntitlements
                overview={overview}
                panelOverview={panelOverview}
                reasons={reasons}
                selectedStoreId={selectedStoreId}
                status={status}
                onReasonChange={(featureKey, reason) =>
                  setReasons((current) => ({
                    ...current,
                    [featureKey]: reason,
                  }))
                }
                onStoreChange={setSelectedStoreId}
                onUpdate={updateEntitlement}
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
      ) : (
        <FeatureEmptyState
          body="Sincronizando assinatura, alocacoes e cobranca consolidada."
          icon={Sparkles}
          title="Carregando billing da agencia"
        />
      )}
    </FeaturePageShell>
  );
}
