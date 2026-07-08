import { AlertOctagon, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import type { AgencyTenantOverview } from "../apiClient";

export interface AgencyStore {
  id: string;
  nome_da_loja: string;
  subdominio: string;
  plano: string;
  status_assinatura: string;
  plan_end_date: string;
  asaas_customer_id: string | null;
  data_criacao: string;
  settings?: {
    profile_name?: string;
    whatsapp_number?: string;
    cidade?: string;
    estado?: string;
  };
  _count?: {
    veiculos: number;
  };
}

export type AgencySort =
  "recent" | "oldest" | "alphabetical" | "vehicles" | "status";

export type AgencyStatusFilter =
  "all" | "active" | "expiring" | "expired" | "inactive";

export function getPlanStatus(store: AgencyStore) {
  const endDate = new Date(store.plan_end_date);
  const now = new Date();
  const isExpired = endDate.getTime() <= now.getTime();
  const isActive = store.status_assinatura.toUpperCase() === "ATIVA";
  const daysLeft = Math.ceil(
    (endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
  );

  if (!isActive || (isExpired && daysLeft <= -7)) {
    return {
      label: "Inativo",
      icon: AlertOctagon,
      classes: "badge-inactive",
    };
  }
  if (isExpired) {
    return {
      label: "Expirou",
      icon: AlertTriangle,
      classes: "badge-expired",
    };
  }
  if (daysLeft <= 5) {
    return {
      label: "Vence em breve",
      icon: Clock,
      classes: "badge-expiring",
    };
  }
  return { label: "Ativo", icon: CheckCircle2, classes: "badge-active" };
}

export function mapAgencyOverviewToStores(data: AgencyTenantOverview) {
  return data.stores.map((store, idx) => {
    const storeName = store.storeName || `Loja ${idx + 1}`;
    return {
      id: store.storeId,
      nome_da_loja: storeName,
      subdominio: store.storeSlug,
      plano: store.planName ?? "Sem plano",
      status_assinatura: isActiveSubscription(store.subscriptionStatus)
        ? "ATIVA"
        : "INATIVA",
      plan_end_date:
        data.subscription?.currentPeriodEnd ??
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      asaas_customer_id: null,
      data_criacao: store.createdAt,
      settings: {
        profile_name: storeName,
      },
      _count: {
        veiculos: store.vehicleCount,
      },
    } satisfies AgencyStore;
  });
}

function isActiveSubscription(status: string | null) {
  return status === "active" || status === "trialing";
}
