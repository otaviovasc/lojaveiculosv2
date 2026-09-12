import { readApiJson } from "../../lib/apiErrors";
import type {
  BillingAuth,
  BillingOverview,
  BillingPlanHire,
  BillingPlanQuote,
  BillingProviderStatus,
  CreateBillingPlanHireInput,
} from "./types";

export type BillingApi = {
  createPlanHire: (
    input: CreateBillingPlanHireInput,
  ) => Promise<BillingPlanHire>;
  getPlanHire: (hireId: string) => Promise<BillingPlanHire>;
  getOverview: () => Promise<BillingOverview>;
  getProviderStatus: () => Promise<BillingProviderStatus>;
  requestPlanQuote: (planId: string) => Promise<BillingPlanQuote>;
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
    createPlanHire: (input) =>
      fetch(billingRoutes.planHires(baseUrl), {
        body: JSON.stringify(input),
        headers: createBillingHeaders(auth),
        method: "POST",
      }).then(readJson<BillingPlanHire>),
    getPlanHire: (hireId) =>
      fetch(billingRoutes.planHire(hireId, baseUrl), {
        headers: createBillingHeaders(auth),
      }).then(readJson<BillingPlanHire>),
    getOverview: () =>
      fetch(billingRoutes.overview(baseUrl), {
        headers: createBillingHeaders(auth),
      }).then(readJson<BillingOverview>),
    getProviderStatus: () =>
      fetch(billingRoutes.providerStatus(baseUrl), {
        headers: createBillingHeaders(auth),
      }).then(readJson<BillingProviderStatus>),
    requestPlanQuote: (planId) =>
      fetch(billingRoutes.planQuotes(baseUrl), {
        body: JSON.stringify({ planId }),
        headers: createBillingHeaders(auth),
        method: "POST",
      }).then(readJson<BillingPlanQuote>),
  };
}

export const billingRoutes = {
  overview: (baseUrl?: string) =>
    createBillingEndpoint("/billing/overview", baseUrl),
  planHire: (hireId: string, baseUrl?: string) =>
    createBillingEndpoint(
      `/billing/plan-hires/${encodeURIComponent(hireId)}`,
      baseUrl,
    ),
  planHires: (baseUrl?: string) =>
    createBillingEndpoint("/billing/plan-hires", baseUrl),
  planQuotes: (baseUrl?: string) =>
    createBillingEndpoint("/billing/plan-quotes", baseUrl),
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
  return readApiJson<T>(response, { feature: "Billing" });
}
