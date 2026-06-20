import type {
  BillingAuth,
  BillingOverview,
  BillingProviderStatus,
  EntitlementKey,
  UpdateEntitlementInput,
} from "./types";

export type BillingApi = {
  getOverview: () => Promise<BillingOverview>;
  getProviderStatus: () => Promise<BillingProviderStatus>;
  updateEntitlement: (
    featureKey: EntitlementKey,
    input: UpdateEntitlementInput,
  ) => Promise<BillingOverview>;
};

export type CreateBillingApiOptions = {
  auth?: BillingAuth;
  baseUrl?: string;
  fetch: typeof fetch;
};

export function createBillingApi({
  auth = {},
  baseUrl,
  fetch,
}: CreateBillingApiOptions): BillingApi {
  return {
    getOverview: () =>
      fetch(billingRoutes.overview(baseUrl), {
        headers: createBillingHeaders(auth),
      }).then(readJson<BillingOverview>),
    getProviderStatus: () =>
      fetch(billingRoutes.providerStatus(baseUrl), {
        headers: createBillingHeaders(auth),
      }).then(readJson<BillingProviderStatus>),
    updateEntitlement: (featureKey, input) =>
      fetch(billingRoutes.entitlement(featureKey, baseUrl), {
        body: JSON.stringify(input),
        headers: createBillingHeaders(auth),
        method: "PATCH",
      }).then(readJson<BillingOverview>),
  };
}

export const billingRoutes = {
  entitlement: (featureKey: EntitlementKey, baseUrl?: string) =>
    createBillingEndpoint(
      `/billing/entitlements/${encodeURIComponent(featureKey)}`,
      baseUrl,
    ),
  overview: (baseUrl?: string) =>
    createBillingEndpoint("/billing/overview", baseUrl),
  providerStatus: (baseUrl?: string) =>
    createBillingEndpoint("/billing/provider/status", baseUrl),
} as const;

function createBillingHeaders(auth: BillingAuth): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (auth.accessToken) headers.Authorization = `Bearer ${auth.accessToken}`;
  if (auth.clerkUserId) headers["x-clerk-user-id"] = auth.clerkUserId;
  if (auth.storeSlug) headers["x-store-slug"] = auth.storeSlug;
  return headers;
}

function createBillingEndpoint(path: string, baseUrl = "/api/v1") {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Billing request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}
