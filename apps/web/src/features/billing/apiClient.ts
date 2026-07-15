import { readApiJson } from "../../lib/apiErrors";
import type {
  BillingAuth,
  BillingCheckoutSession,
  BillingOverview,
  BillingProviderStatus,
  CreateBillingCheckoutInput,
  EntitlementKey,
  SyncBillingProviderSubscriptionInput,
  UpdateEntitlementInput,
  UpdateBillingSelectionInput,
} from "./types";

export type BillingApi = {
  createCheckout: (
    input: CreateBillingCheckoutInput,
  ) => Promise<BillingCheckoutSession>;
  getOverview: () => Promise<BillingOverview>;
  getProviderStatus: () => Promise<BillingProviderStatus>;
  syncProviderSubscription: (
    input: SyncBillingProviderSubscriptionInput,
  ) => Promise<unknown>;
  updateSelection: (
    input: UpdateBillingSelectionInput,
  ) => Promise<BillingOverview>;
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
    createCheckout: (input) =>
      fetch(billingRoutes.providerCheckout(baseUrl), {
        body: JSON.stringify(input),
        headers: createBillingHeaders(auth),
        method: "POST",
      }).then(readJson<BillingCheckoutSession>),
    getOverview: () =>
      fetch(billingRoutes.overview(baseUrl), {
        headers: createBillingHeaders(auth),
      }).then(readJson<BillingOverview>),
    getProviderStatus: () =>
      fetch(billingRoutes.providerStatus(baseUrl), {
        headers: createBillingHeaders(auth),
      }).then(readJson<BillingProviderStatus>),
    syncProviderSubscription: (input) =>
      fetch(billingRoutes.providerSync(baseUrl), {
        body: JSON.stringify(input),
        headers: createBillingHeaders(auth),
        method: "POST",
      }).then(readJson<unknown>),
    updateSelection: (input) =>
      fetch(billingRoutes.selection(baseUrl), {
        body: JSON.stringify(input),
        headers: createBillingHeaders(auth),
        method: "PUT",
      }).then(readJson<BillingOverview>),
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
  providerCheckout: (baseUrl?: string) =>
    createBillingEndpoint("/billing/provider/checkout", baseUrl),
  providerStatus: (baseUrl?: string) =>
    createBillingEndpoint("/billing/provider/status", baseUrl),
  providerSync: (baseUrl?: string) =>
    createBillingEndpoint("/billing/provider/subscription/sync", baseUrl),
  selection: (baseUrl?: string) =>
    createBillingEndpoint("/billing/selection", baseUrl),
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
  return readApiJson<T>(response, { feature: "Billing" });
}
