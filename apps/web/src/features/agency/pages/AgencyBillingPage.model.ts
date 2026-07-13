import type {
  BillingEntitlementStatus,
  BillingOverview,
  BillingProviderStatus,
  EntitlementKey,
} from "../../billing/types";
import { formatApiErrorDisplay } from "../../../lib/apiErrors";
import type { AgencyTenantOverview } from "../apiClient";

export type AgencyBillingStatus =
  | { kind: "error"; message: string }
  | { kind: "loading" }
  | { kind: "ready" }
  | { featureKey: EntitlementKey; kind: "saving" }
  | { kind: "syncing" };

export type AgencyBillingCanonicalState = {
  canCheckout: boolean;
  description: string;
  integrationRequirements: readonly string[];
  kind:
    | "current"
    | "payment_attention"
    | "provider_attention"
    | "ready_to_subscribe";
  label: string;
  metricLabel: string;
  title: string;
  tone: "danger" | "info" | "success" | "warning";
};

const providerConfigurationLabels = [
  ["ASAAS_RUNTIME_IMPLEMENTATION", "Módulo de conexão com o Asaas"],
  ["ASAAS_API_URL", "Endereço da API do Asaas"],
  ["ASAAS_API_KEY", "Credencial de acesso do Asaas"],
  ["PUBLIC_APP_URL", "Endereço público do aplicativo"],
  ["ASAAS_WEBHOOK_SECRET", "Chave de validação do webhook"],
  ["ASAAS_WEBHOOK_URL", "Endereço do webhook de cobrança"],
] as const;

export function createAgencyBillingPanelOverview(
  overview: AgencyTenantOverview | null,
  selectedStoreId: string | null,
): BillingOverview | null {
  if (!overview) return null;
  const selectedStore =
    overview.stores.find((store) => store.storeId === selectedStoreId) ??
    overview.stores[0] ??
    null;
  const selectedPlan = selectedStore?.planCode
    ? (overview.plans.find((plan) => plan.code === selectedStore.planCode) ??
      null)
    : null;

  return {
    addons: overview.addons,
    allocations: overview.allocations,
    authority: overview.authority,
    chargePreview: overview.chargePreview,
    entitlementEvents: overview.entitlementEvents,
    entitlementMatrix: selectedStore?.entitlementMatrix ?? [],
    entitlements: [],
    financialSummary: overview.financialSummary,
    plans: overview.plans,
    storeId: selectedStore?.storeId ?? "",
    subscription: overview.subscription
      ? { ...overview.subscription, plan: selectedPlan }
      : null,
    tenantId: overview.tenantId,
  };
}

export function createAgencyBillingCanonicalState(
  overview: BillingOverview,
  providerStatus: BillingProviderStatus | null,
): AgencyBillingCanonicalState {
  const subscription = overview.subscription;
  const configurationLabels = agencyBillingConfigurationLabels(
    providerStatus?.missingConfiguration ?? [],
  );
  const providerReady = Boolean(
    providerStatus?.configured && providerStatus.webhookConfigured,
  );
  const integrationRequirements =
    providerReady || configurationLabels.length > 0
      ? configurationLabels
      : ["Recebimento de confirmações de cobrança"];
  const planName = subscription?.plan?.name ?? "contratado";

  if (subscription?.status === "active") {
    return {
      canCheckout: false,
      description: `A cobrança consolidada está ativa no plano ${planName}.`,
      integrationRequirements,
      kind: "current",
      label: "Assinatura vigente",
      metricLabel: "Ativa",
      title: "Assinatura ativa",
      tone: "success",
    };
  }

  if (subscription?.status === "trialing") {
    return {
      canCheckout: false,
      description: `O plano ${planName} está em período de teste. Nenhuma nova contratação é necessária.`,
      integrationRequirements,
      kind: "current",
      label: "Situação atual",
      metricLabel: "Em teste",
      title: "Período de teste ativo",
      tone: "info",
    };
  }

  if (subscription?.status === "past_due") {
    return {
      canCheckout: false,
      description:
        "Há uma cobrança que requer regularização. A assinatura existente será preservada durante a conciliação.",
      integrationRequirements,
      kind: "payment_attention",
      label: "Ação financeira necessária",
      metricLabel: "Em atraso",
      title: "Pagamento em atraso",
      tone: "danger",
    };
  }

  if (!providerReady) {
    return {
      canCheckout: false,
      description:
        "O checkout permanece bloqueado até a conexão de cobrança estar completa e pronta para conciliação.",
      integrationRequirements,
      kind: "provider_attention",
      label: "Configuração necessária",
      metricLabel: "Configurar",
      title: "Integração de cobrança pendente",
      tone: "warning",
    };
  }

  return {
    canCheckout: true,
    description:
      subscription?.status === "cancelled" || subscription?.status === "expired"
        ? "A assinatura anterior foi encerrada. Um novo checkout pode ser iniciado com segurança."
        : "Não há assinatura vigente. O checkout está pronto para iniciar uma contratação.",
    integrationRequirements: [],
    kind: "ready_to_subscribe",
    label: "Checkout disponível",
    metricLabel: "Não contratada",
    title:
      subscription?.status === "cancelled" || subscription?.status === "expired"
        ? "Assinatura encerrada"
        : "Assinatura pronta para contratar",
    tone: "info",
  };
}

export function agencyBillingConfigurationLabels(
  missingConfiguration: readonly string[],
) {
  return [
    ...new Set(
      missingConfiguration.map((configuration) => {
        const match = providerConfigurationLabels.find(([key]) =>
          configuration.startsWith(key),
        );
        return match?.[1] ?? "Configuração complementar da integração";
      }),
    ),
  ];
}

export function agencyBillingDefaultReason(status: BillingEntitlementStatus) {
  return status === "active"
    ? "Entitlement enabled from agency billing console."
    : "Entitlement changed from agency billing console.";
}

export function agencyBillingErrorMessage(error: unknown) {
  return formatApiErrorDisplay(
    error,
    "Nao foi possivel carregar o faturamento da agencia.",
  );
}
