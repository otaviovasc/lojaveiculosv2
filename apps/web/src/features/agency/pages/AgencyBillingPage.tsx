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
import { FeatureTabs } from "../../../components/ui/FeatureTabs";
import { BillingEventList } from "../../billing/BillingPanels";
import { BillingAutomaticBillingPanel } from "../../billing/BillingAutomaticBillingPanel";
import { readBillingCheckoutReturn } from "../../billing/billingCheckoutReturn";
import type { BillingCheckoutState } from "../../billing/BillingCheckoutPanel";
import type { BillingProviderStatus } from "../../billing/types";
import { useAccountSession } from "../../account/accountSession";
import type { AgencyApi, AgencyTenantOverview } from "../apiClient";
import {
  agencyBillingErrorMessage,
  createAgencyBillingPanelOverview,
  type AgencyBillingStatus,
  type AgencyBillingTab,
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
  const [activeTab, setActiveTab] = useState<AgencyBillingTab>("overview");
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
          <FeatureTabs
            ariaLabel="Seções do plano do grupo"
            className="billing-tabs"
            onChange={setActiveTab}
            options={[
              { label: "Plano e pacotes", value: "overview" },
              { label: "Cobrança", value: "billing" },
              { label: "Histórico", value: "history" },
            ]}
            value={activeTab}
          />
          {activeTab === "overview" ? (
            <>
              <AgencyBillingStoreEntitlements
                overview={overview}
                panelOverview={panelOverview}
                selectedStoreId={selectedStoreId}
                onStoreChange={setSelectedStoreId}
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
