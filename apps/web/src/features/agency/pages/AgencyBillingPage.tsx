import { CreditCard, RefreshCcw, Sparkles, UploadCloud } from "lucide-react";
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
import {
  BillingAllocationTable,
  BillingEventList,
  BillingKpiGrid,
} from "../../billing/BillingPanels";
import { BillingAutomaticBillingPanel } from "../../billing/BillingAutomaticBillingPanel";
import { readBillingCheckoutReturn } from "../../billing/billingCheckoutReturn";
import {
  BillingCheckoutPanel,
  type BillingCheckoutState,
} from "../../billing/BillingCheckoutPanel";
import { BillingProviderPanel } from "../../billing/BillingProviderPanel";
import type {
  BillingEntitlementStatus,
  BillingOverview,
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

  const syncProvider = async () => {
    if (!agencyTenant) return;
    setStatus({ kind: "syncing" });
    try {
      const billingApi = api ?? (await createRuntimeAgencyBillingApi());
      await billingApi.syncProviderSubscription(agencyTenant.tenantId);
      const [nextOverview, nextProviderStatus] = await Promise.all([
        billingApi.getOverview(agencyTenant.tenantId),
        billingApi.getProviderStatus(agencyTenant.tenantId),
      ]);
      setOverview(nextOverview);
      setProviderStatus(nextProviderStatus);
      setStatus({ kind: "ready" });
    } catch (error) {
      setStatus({ kind: "error", message: agencyBillingErrorMessage(error) });
    }
  };

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
          <div className="flex flex-wrap items-center gap-2">
            <FeatureActionButton
              icon={UploadCloud}
              label="Sincronizar Asaas"
              onClick={() => void syncProvider()}
            />
            <FeatureActionButton
              icon={RefreshCcw}
              label="Atualizar"
              onClick={() => void refresh()}
            />
          </div>
        }
        description="Assinatura, cobranca consolidada e entitlements das lojas vinculadas ao tenant da agencia."
        eyebrow={
          <>
            <CreditCard aria-hidden="true" className="size-4" />
            Billing da Agencia
          </>
        }
        title="Cobranca unificada"
      />

      {status.kind === "error" ? (
        <FeatureAlert className="billing-alert">{status.message}</FeatureAlert>
      ) : null}
      {checkoutReturn ? (
        <FeatureAlert className="billing-alert" title={checkoutReturn.title}>
          {checkoutReturn.message}
        </FeatureAlert>
      ) : null}

      {overview && panelOverview ? (
        <>
          {providerStatus ? (
            <BillingProviderPanel status={providerStatus} />
          ) : null}
          <BillingCheckoutPanel
            checkoutState={checkoutState}
            overview={panelOverview}
            providerStatus={providerStatus}
            onCheckout={(input) =>
              agencyTenant
                ? startCheckout(agencyTenant.tenantId, input)
                : Promise.reject(new Error("Agency tenant not found."))
            }
          />
          <BillingAutomaticBillingPanel overview={panelOverview} />
          <BillingKpiGrid overview={panelOverview} />
          <BillingAllocationTable allocations={overview.allocations} />
          <AgencyBillingStoreEntitlements
            overview={overview}
            panelOverview={panelOverview}
            reasons={reasons}
            selectedStoreId={selectedStoreId}
            status={status}
            onReasonChange={(featureKey, reason) =>
              setReasons((current) => ({ ...current, [featureKey]: reason }))
            }
            onStoreChange={setSelectedStoreId}
            onUpdate={updateEntitlement}
          />
          <BillingEventList events={overview.entitlementEvents} />
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
