import { CreditCard, RefreshCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "../../../styles/billing-panels.css";
import {
  FeatureActionButton,
  FeaturePageHeader,
  FeaturePageShell,
} from "../../../components/ui/FeatureLayout";
import {
  FeatureAlert,
  FeatureLoadingState,
} from "../../../components/ui/FeatureStates";
import { Toast, type ToastTone } from "../../../components/ui/Toast";
import { FeatureTabs } from "../../../components/ui/FeatureTabs";
import { BillingEventList } from "../../billing/BillingPanels";
import { BillingAutomaticBillingPanel } from "../../billing/BillingAutomaticBillingPanel";
import { readBillingCheckoutReturn } from "../../billing/billingCheckoutReturn";
import type { BillingCheckoutState } from "../../billing/BillingCheckoutPanel";
import type {
  BillingAddonContract,
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
  startAgencyStoreCheckout,
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
  const requestGeneration = useRef(0);
  const { agencyTenant, agencyTenants, selectAgencyTenant } =
    useAgencyTenantSelection();
  const [searchParams, setSearchParams] = useSearchParams();
  const [overview, setOverview] = useState<AgencyTenantOverview | null>(null);
  const [providerStatus, setProviderStatus] =
    useState<BillingProviderStatus | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(() =>
    searchParams.get("storeId"),
  );
  const [status, setStatus] = useState<AgencyBillingStatus>({
    kind: "loading",
  });
  const [checkoutState, setCheckoutState] = useState<BillingCheckoutState>({
    kind: "idle",
  });
  const [activeTab, setActiveTab] = useState<AgencyBillingTab>("overview");
  const [zapiRequestSaving, setZapiRequestSaving] = useState(false);
  const [toast, setToast] = useState<{
    title: string;
    tone: ToastTone;
  } | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const checkoutReturn = readBillingCheckoutReturn("agency");

  const refresh = useCallback(async () => {
    const generation = ++requestGeneration.current;
    if (!agencyTenant) {
      setStatus({
        kind: "error",
        message: "Nenhum tenant de agência ativo foi encontrado.",
      });
      return;
    }
    setStatus({ kind: "loading" });
    setOverview(null);
    setProviderStatus(null);
    try {
      const billingApi = api ?? (await createRuntimeAgencyBillingApi());
      const [nextOverview, nextProviderStatus] = await Promise.all([
        billingApi.getOverview(agencyTenant.tenantId),
        billingApi.getProviderStatus(agencyTenant.tenantId),
      ]);
      if (generation !== requestGeneration.current) return;
      setOverview(nextOverview);
      setProviderStatus(nextProviderStatus);
      setSelectedStoreId((current) =>
        nextOverview.stores.some((store) => store.storeId === current)
          ? current
          : (nextOverview.stores[0]?.storeId ?? null),
      );
      setStatus({ kind: "ready" });
    } catch (error) {
      if (generation !== requestGeneration.current) return;
      setStatus({ kind: "error", message: agencyBillingErrorMessage(error) });
    }
  }, [agencyTenant, api]);

  useEffect(() => {
    void refresh();
    return () => {
      requestGeneration.current += 1;
    };
  }, [refresh]);

  useEffect(() => {
    const requestedStoreId = searchParams.get("storeId");
    if (
      !requestedStoreId ||
      !overview?.stores.some((store) => store.storeId === requestedStoreId)
    ) {
      return;
    }
    setSelectedStoreId(requestedStoreId);
  }, [overview, searchParams]);

  useEffect(() => {
    if (
      !selectedStoreId ||
      !overview?.stores.some((store) => store.storeId === selectedStoreId) ||
      searchParams.get("storeId") === selectedStoreId
    ) {
      return;
    }
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set("storeId", selectedStoreId);
    setSearchParams(nextSearchParams, { replace: true });
  }, [overview, searchParams, selectedStoreId, setSearchParams]);

  const selectStore = (storeId: string) => {
    setSelectedStoreId(storeId);
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set("storeId", storeId);
    setSearchParams(nextSearchParams, { replace: true });
  };

  const panelOverview = useMemo(
    () => createAgencyBillingPanelOverview(overview, selectedStoreId),
    [overview, selectedStoreId],
  );

  useEffect(() => {
    if (!overview || !selectedStoreId) return;
    const selectedStore = overview.stores.find(
      (store) => store.storeId === selectedStoreId,
    );
    const selectedPlan = selectedStore?.planCode
      ? overview.plans.find((plan) => plan.code === selectedStore.planCode)
      : overview.plans.find((plan) => plan.status === "active");
    setSelectedPlanId(selectedPlan?.id ?? null);
    setSelectedAddonIds(
      overview.addons.flatMap((addon) =>
        (!selectedPlan ||
          addon.catalogVersion === selectedPlan.catalogVersion) &&
        selectedStore?.entitlementMatrix.some(
          (row) =>
            row.featureKey === addon.featureKey &&
            (row.status === "active" || row.status === "trialing"),
        )
          ? [addon.id]
          : [],
      ),
    );
  }, [overview, selectedStoreId]);

  const startCheckout: AgencyApi["createCheckout"] = async (
    tenantId,
    input,
  ) => {
    setCheckoutState({ kind: "starting" });
    try {
      if (!selectedStoreId || !selectedPlanId) {
        throw new Error("Selecione uma loja e um plano antes de continuar.");
      }
      const billingApi = api ?? (await createRuntimeAgencyBillingApi());
      const checkout = await startAgencyStoreCheckout({
        addonIds: selectedAddonIds,
        api: billingApi,
        input,
        planId: selectedPlanId,
        storeId: selectedStoreId,
        tenantId,
      });
      setCheckoutState({ kind: "started" });
      window.location.assign(checkout.checkoutUrl);
      return checkout;
    } catch (error) {
      setCheckoutState({ kind: "idle" });
      setStatus({ kind: "error", message: agencyBillingErrorMessage(error) });
      throw error;
    }
  };

  const updateZapiRequest = async (action: "cancel" | "request") => {
    if (!agencyTenant || !selectedStoreId) return;
    setZapiRequestSaving(true);
    try {
      const billingApi = api ?? (await createRuntimeAgencyBillingApi());
      const response =
        action === "request"
          ? await billingApi.requestStoreZapi(
              agencyTenant.tenantId,
              selectedStoreId,
            )
          : await billingApi.cancelStoreZapiRequest(
              agencyTenant.tenantId,
              selectedStoreId,
            );
      setOverview((current) =>
        current
          ? withAgencyStoreContract(current, selectedStoreId, response.contract)
          : current,
      );
      setToast(
        action === "request"
          ? { title: "Solicitação Z-API enviada para a loja.", tone: "success" }
          : { title: "Solicitação Z-API cancelada.", tone: "info" },
      );
    } catch (error) {
      setStatus({ kind: "error", message: agencyBillingErrorMessage(error) });
    } finally {
      setZapiRequestSaving(false);
    }
  };

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
              isBusy={status.kind === "loading"}
              label="Atualizar"
              onClick={() => void refresh()}
            />
          </>
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
                zapiRequestSaving={zapiRequestSaving}
                selectedAddonIds={selectedAddonIds}
                onAddonToggle={(addonId) =>
                  setSelectedAddonIds((current) => {
                    const selectedAddon = overview.addons.find(
                      (addon) => addon.id === addonId,
                    );
                    const zapiAddon = overview.addons.find(
                      (addon) =>
                        addon.code === "crm_zapi" &&
                        addon.catalogVersion === selectedAddon?.catalogVersion,
                    );
                    if (selectedAddon?.code === "crm_core") {
                      return current.includes(addonId)
                        ? current.filter(
                            (id) => id !== addonId && id !== zapiAddon?.id,
                          )
                        : [...current, addonId];
                    }
                    return current.includes(addonId)
                      ? current.filter((id) => id !== addonId)
                      : [...current, addonId];
                  })
                }
                onCancelZapi={() => void updateZapiRequest("cancel")}
                onRequestZapi={() => void updateZapiRequest("request")}
                onStoreChange={selectStore}
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
      ) : status.kind === "loading" || !overview || !panelOverview ? (
        <FeatureLoadingState title="Carregando cobrança da agência">
          Sincronizando assinatura, alocações e cobrança consolidada.
        </FeatureLoadingState>
      ) : null}
      {toast ? (
        <Toast
          onDismiss={() => setToast(null)}
          title={toast.title}
          tone={toast.tone}
        />
      ) : null}
    </FeaturePageShell>
  );
}

function withAgencyStoreContract(
  overview: AgencyTenantOverview,
  storeId: string,
  contract: BillingAddonContract,
): AgencyTenantOverview {
  return {
    ...overview,
    stores: overview.stores.map((store) =>
      store.storeId === storeId
        ? {
            ...store,
            addonContracts: [
              ...(store.addonContracts ?? []).filter(
                (candidate) => candidate.addonCode !== contract.addonCode,
              ),
              contract,
            ],
          }
        : store,
    ),
  };
}
