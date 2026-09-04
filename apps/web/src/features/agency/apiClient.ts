import { readApiJson } from "../../lib/apiErrors";
import type {
  BillingChargePreview,
  BillingEntitlementEvent,
  BillingEntitlementMatrixRow,
  BillingFinancialSummary,
  BillingPlan,
  BillingProviderStatus,
  BillingStoreAllocation,
  BillingSubscription,
  BillingPlanHire,
  BillingPlanQuote,
  CreateBillingPlanHireInput,
} from "../billing/types";

export type AgencyAuth = {
  accessToken?: string;
  clerkUserId?: string;
  userEmail?: string;
  userName?: string;
};

export type AgencyTenantOverview = {
  allocations: readonly BillingStoreAllocation[];
  authority: {
    currentActorCanManage: boolean;
    managedBy: "agency" | "store_owner";
    managerLabel: string;
    ownerBillingAccess: "allowed" | "blocked_by_agency";
    summary: string;
  };
  chargePreview: BillingChargePreview;
  entitlementEvents: readonly BillingEntitlementEvent[];
  financialSummary: BillingFinancialSummary;
  plans: readonly BillingPlan[];
  stores: readonly AgencyManagedStoreOverview[];
  subscription: BillingSubscription | null;
  tenant: {
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
  };
  tenantId: string;
};

export type AgencyManagedStoreOverview = {
  activeEntitlementCount: number;
  addonCount: number;
  createdAt: string;
  entitlementCount: number;
  entitlementMatrix: readonly BillingEntitlementMatrixRow[];
  monthlyAmountCents: number;
  planCode: string | null;
  planName: string | null;
  storeId: string;
  storeName: string;
  storeSlug: string;
  subscriptionStatus: BillingSubscription["status"] | null;
  vehicleCount: number;
};

export type AgencyStatsPeriod = { from: string; to: string };

export type AgencyStatsStoreOption = {
  storeId: string;
  storeName: string;
  storeSlug: string;
};

export type AgencyStatsStoreRow = AgencyStatsStoreOption & {
  inventory: {
    availableListings: number;
    reservedUnits: number;
    totalListings: number;
  };
  leads: {
    activeCount: number;
    conversionRate: number;
    totalCount: number;
    wonCount: number;
  };
  sales: {
    averageTicketCents: number;
    closedCount: number;
    grossMarginCents: number;
    revenueCents: number;
  };
};

export type AgencyStatsReport = {
  availableStores: readonly AgencyStatsStoreOption[];
  generatedAt: string;
  leadSources: readonly { count: number; key: string; label: string }[];
  period: AgencyStatsPeriod;
  scopeStoreId: string | null;
  stores: readonly AgencyStatsStoreRow[];
  tenantId: string;
  totals: {
    inventory: AgencyStatsStoreRow["inventory"];
    leads: AgencyStatsStoreRow["leads"];
    sales: AgencyStatsStoreRow["sales"];
    storeCount: number;
  };
};

export type AgencyApi = {
  createStorePlanHire: (
    tenantId: string,
    storeId: string,
    input: CreateBillingPlanHireInput,
  ) => Promise<BillingPlanHire>;
  getStorePlanHire: (
    tenantId: string,
    storeId: string,
    hireId: string,
  ) => Promise<BillingPlanHire>;
  getOverview: (tenantId: string) => Promise<AgencyTenantOverview>;
  getStats?: (
    tenantId: string,
    input: AgencyStatsPeriod & { storeId?: string },
  ) => Promise<AgencyStatsReport>;
  getProviderStatus: (tenantId: string) => Promise<BillingProviderStatus>;
  requestStorePlanQuote: (
    tenantId: string,
    storeId: string,
    planId: string,
  ) => Promise<BillingPlanQuote>;
};

export function createAgencyApi(options: {
  auth?: AgencyAuth;
  baseUrl?: string;
  fetch: typeof fetch;
}): AgencyApi {
  const auth = options.auth ?? {};
  const request = <T>(path: string, init?: RequestInit) =>
    options.fetch.call(globalThis, path, init).then(readJson<T>);
  return {
    createStorePlanHire: (tenantId, storeId, input) =>
      request<BillingPlanHire>(
        routes.storePlanHires(tenantId, storeId, options.baseUrl),
        {
          body: JSON.stringify(input),
          headers: headers(auth),
          method: "POST",
        },
      ),
    getOverview: (tenantId) =>
      request<AgencyTenantOverview>(
        routes.overview(tenantId, options.baseUrl),
        {
          headers: headers(auth),
        },
      ),
    getStats: (tenantId, input) =>
      request<AgencyStatsReport>(
        routes.stats(tenantId, input, options.baseUrl),
        { headers: headers(auth) },
      ),
    getProviderStatus: (tenantId) =>
      request<BillingProviderStatus>(
        routes.providerStatus(tenantId, options.baseUrl),
        { headers: headers(auth) },
      ),
    getStorePlanHire: (tenantId, storeId, hireId) =>
      request<BillingPlanHire>(
        routes.storePlanHire(tenantId, storeId, hireId, options.baseUrl),
        { headers: headers(auth) },
      ),
    requestStorePlanQuote: (tenantId, storeId, planId) =>
      request<BillingPlanQuote>(
        routes.storePlanQuotes(tenantId, storeId, options.baseUrl),
        {
          body: JSON.stringify({ planId }),
          headers: headers(auth),
          method: "POST",
        },
      ),
  };
}

const routes = {
  overview: (tenantId: string, baseUrl?: string) =>
    endpoint(
      `/agency/tenants/${encodeURIComponent(tenantId)}/overview`,
      baseUrl,
    ),
  stats: (
    tenantId: string,
    input: AgencyStatsPeriod & { storeId?: string },
    baseUrl?: string,
  ) => {
    const query = new URLSearchParams({ from: input.from, to: input.to });
    if (input.storeId) query.set("storeId", input.storeId);
    return endpoint(
      `/agency/tenants/${encodeURIComponent(tenantId)}/stats?${query.toString()}`,
      baseUrl,
    );
  },
  providerStatus: (tenantId: string, baseUrl?: string) =>
    endpoint(
      `/agency/tenants/${encodeURIComponent(tenantId)}/billing/provider/status`,
      baseUrl,
    ),
  storePlanHire: (
    tenantId: string,
    storeId: string,
    hireId: string,
    baseUrl?: string,
  ) =>
    endpoint(
      `/agency/tenants/${encodeURIComponent(tenantId)}/stores/${encodeURIComponent(storeId)}/billing/plan-hires/${encodeURIComponent(hireId)}`,
      baseUrl,
    ),
  storePlanHires: (tenantId: string, storeId: string, baseUrl?: string) =>
    endpoint(
      `/agency/tenants/${encodeURIComponent(tenantId)}/stores/${encodeURIComponent(storeId)}/billing/plan-hires`,
      baseUrl,
    ),
  storePlanQuotes: (tenantId: string, storeId: string, baseUrl?: string) =>
    endpoint(
      `/agency/tenants/${encodeURIComponent(tenantId)}/stores/${encodeURIComponent(storeId)}/billing/plan-quotes`,
      baseUrl,
    ),
} as const;

function headers(auth: AgencyAuth): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (auth.accessToken) headers.Authorization = `Bearer ${auth.accessToken}`;
  if (auth.clerkUserId) headers["x-clerk-user-id"] = auth.clerkUserId;
  if (auth.userEmail) headers["x-user-email"] = auth.userEmail;
  if (auth.userName) headers["x-user-name"] = auth.userName;
  return headers;
}

function endpoint(path: string, baseUrl = "/api/v1") {
  return `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

async function readJson<T>(response: Response): Promise<T> {
  return readApiJson<T>(response, { feature: "Agencia" });
}
