import { AlertOctagon, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

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
  | "recent"
  | "oldest"
  | "alphabetical"
  | "vehicles"
  | "status";

export type AgencyStatusFilter =
  | "all"
  | "active"
  | "expiring"
  | "expired"
  | "inactive";

type BillingAllocation = {
  activeEntitlementCount?: number | undefined;
  planName?: string | undefined;
  storeId?: string | undefined;
  storeName?: string | undefined;
  subscriptionStatus?: string | undefined;
};

export const MOCK_STORES: AgencyStore[] = [
  {
    id: "1",
    nome_da_loja: "Elite Motors",
    subdominio: "elitemotors",
    plano: "PREMIUM PRO",
    status_assinatura: "ATIVA",
    plan_end_date: new Date(
      Date.now() + 25 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    asaas_customer_id: "cus_123456",
    data_criacao: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    settings: {
      profile_name: "Elite Motors Jardins",
      whatsapp_number: "11999999999",
      cidade: "São Paulo",
      estado: "SP",
    },
    _count: { veiculos: 42 },
  },
  {
    id: "2",
    nome_da_loja: "Carro Fácil",
    subdominio: "carrofacil",
    plano: "START",
    status_assinatura: "ATIVA",
    plan_end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    asaas_customer_id: "cus_789012",
    data_criacao: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    settings: {
      profile_name: "Carro Fácil Seminovos",
      whatsapp_number: "21988888888",
      cidade: "Rio de Janeiro",
      estado: "RJ",
    },
    _count: { veiculos: 18 },
  },
  {
    id: "3",
    nome_da_loja: "Prime Select",
    subdominio: "primeselect",
    plano: "ENTERPRISE",
    status_assinatura: "ATIVA",
    plan_end_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    asaas_customer_id: null,
    data_criacao: new Date(
      Date.now() - 120 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    settings: {
      profile_name: "Prime Select Exclusive",
      whatsapp_number: "31977777777",
      cidade: "Belo Horizonte",
      estado: "MG",
    },
    _count: { veiculos: 85 },
  },
  {
    id: "4",
    nome_da_loja: "Norte Veículos",
    subdominio: "norteveiculos",
    plano: "START",
    status_assinatura: "INATIVA",
    plan_end_date: new Date(
      Date.now() - 15 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    asaas_customer_id: "cus_345678",
    data_criacao: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    settings: {
      profile_name: "Norte Veículos Filial",
      whatsapp_number: "81966666666",
      cidade: "Recife",
      estado: "PE",
    },
    _count: { veiculos: 0 },
  },
];

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

export function mapBillingOverviewToStores(data: unknown) {
  if (!isRecord(data) || !Array.isArray(data.allocations)) return null;

  return data.allocations.map((allocation, idx) => {
    const item = readBillingAllocation(allocation);
    const storeName = item.storeName ?? `Loja ${idx + 1}`;

    return {
      id: item.storeId ?? String(idx),
      nome_da_loja: storeName,
      subdominio: storeName.toLowerCase().replace(/[^a-z0-9]/g, ""),
      plano: item.planName ?? "START",
      status_assinatura:
        item.subscriptionStatus === "active" ? "ATIVA" : "INATIVA",
      plan_end_date: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      asaas_customer_id: null,
      data_criacao: new Date().toISOString(),
      settings: {
        profile_name: storeName,
      },
      _count: {
        veiculos: item.activeEntitlementCount ?? 0,
      },
    } satisfies AgencyStore;
  });
}

function readBillingAllocation(value: unknown): BillingAllocation {
  if (!isRecord(value)) return {};

  return {
    activeEntitlementCount: readNumber(value.activeEntitlementCount),
    planName: readString(value.planName),
    storeId: readString(value.storeId),
    storeName: readString(value.storeName),
    subscriptionStatus: readString(value.subscriptionStatus),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readNumber(value: unknown) {
  return typeof value === "number" ? value : undefined;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}
