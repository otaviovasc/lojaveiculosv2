import { readApiJson } from "../../lib/apiErrors";
import type {
  BillingChargePreview,
  BillingAddon,
  BillingEntitlementEvent,
  BillingEntitlementMatrixRow,
  BillingFinancialSummary,
  BillingPlan,
  BillingProviderStatus,
  BillingStoreAllocation,
  BillingSubscription,
  BillingCheckoutSession,
  CreateBillingCheckoutInput,
  EntitlementKey,
  UpdateEntitlementInput,
} from "../billing/types";

export type AgencyAuth = {
  accessToken?: string;
  clerkUserId?: string;
  userEmail?: string;
  userName?: string;
};

export type AgencyTenantOverview = {
  addons: readonly BillingAddon[];
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

export type AgencyApi = {
  createCheckout: (
    tenantId: string,
    input: CreateBillingCheckoutInput,
  ) => Promise<BillingCheckoutSession>;
  getOverview: (tenantId: string) => Promise<AgencyTenantOverview>;
  getProviderStatus: (tenantId: string) => Promise<BillingProviderStatus>;
  syncProviderSubscription: (tenantId: string) => Promise<unknown>;
  updateStoreEntitlement: (
    tenantId: string,
    storeId: string,
    featureKey: EntitlementKey,
    input: UpdateEntitlementInput,
  ) => Promise<AgencyTenantOverview>;
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
    createCheckout: (tenantId, input) =>
      request<BillingCheckoutSession>(
        routes.providerCheckout(tenantId, options.baseUrl),
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
    getProviderStatus: (tenantId) =>
      request<BillingProviderStatus>(
        routes.providerStatus(tenantId, options.baseUrl),
        { headers: headers(auth) },
      ),
    syncProviderSubscription: (tenantId) =>
      request<unknown>(routes.providerSync(tenantId, options.baseUrl), {
        body: JSON.stringify({ billingType: "PIX" }),
        headers: headers(auth),
        method: "POST",
      }),
    updateStoreEntitlement: (tenantId, storeId, featureKey, input) =>
      request<AgencyTenantOverview>(
        routes.storeEntitlement(tenantId, storeId, featureKey, options.baseUrl),
        {
          body: JSON.stringify(input),
          headers: headers(auth),
          method: "PATCH",
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
  providerStatus: (tenantId: string, baseUrl?: string) =>
    endpoint(
      `/agency/tenants/${encodeURIComponent(tenantId)}/billing/provider/status`,
      baseUrl,
    ),
  providerSync: (tenantId: string, baseUrl?: string) =>
    endpoint(
      `/agency/tenants/${encodeURIComponent(
        tenantId,
      )}/billing/provider/subscription/sync`,
      baseUrl,
    ),
  providerCheckout: (tenantId: string, baseUrl?: string) =>
    endpoint(
      `/agency/tenants/${encodeURIComponent(
        tenantId,
      )}/billing/provider/checkout`,
      baseUrl,
    ),
  storeEntitlement: (
    tenantId: string,
    storeId: string,
    featureKey: EntitlementKey,
    baseUrl?: string,
  ) =>
    endpoint(
      `/agency/tenants/${encodeURIComponent(
        tenantId,
      )}/stores/${encodeURIComponent(storeId)}/entitlements/${encodeURIComponent(
        featureKey,
      )}`,
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
