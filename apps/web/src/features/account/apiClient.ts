import { readApiJson } from "../../lib/apiErrors";

export type AccountAuth = {
  accessToken?: string;
  clerkUserId?: string;
  userEmail?: string;
  userName?: string;
};

export type SessionBootstrap = {
  defaultStore: StoreAccessSummary | null;
  needsOnboarding: boolean;
  platformAdmin: boolean;
  stores: StoreAccessSummary[];
  tenantMemberships: TenantAccessSummary[];
  user: { clerkUserId: string; email: string; id: string; name: string | null };
};

export type StoreAccessSummary = {
  effectivePermissions?: readonly string[];
  entitlements?: readonly string[];
  role: string;
  status: "active" | "invited" | "suspended";
  storeId: string;
  storeName: string;
  storeSlug: string;
  tenantId: string;
  tenantName: string;
};

export type TenantAccessSummary = {
  role: string;
  status: "active" | "invited" | "suspended";
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
};

export type CreateOwnerStoreInput = {
  profile?: {
    contactEmail?: string;
    contactPhone?: string;
    documentNumber?: string;
    whatsappPhone?: string;
  };
  publicSlug: string;
  storeLegalName?: string;
  storeTradingName: string;
  tenantLegalName?: string;
  tenantTradingName?: string;
};

export type CreateAgencyInput = {
  firstUser?: { email: string; name?: string };
  tenantLegalName?: string;
  tenantSlug: string;
  tenantTradingName: string;
};

export type CreateAgencyStoreInput = {
  publicSlug: string;
  storeLegalName?: string;
  storeTradingName: string;
  tenantId: string;
};

export type InvitationStatus =
  "accepted" | "expired" | "pending" | "revoked" | "send_failed" | "sent";

export type IdentityInvitation = {
  email: string;
  id: string;
  role: string;
  status: InvitationStatus;
  storeId: string | null;
  tenantId: string;
};

export type ProvisionedAgency = {
  invitationId: string | null;
  invitationStatus: InvitationStatus | null;
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
};

export type ProvisionedStore = {
  role: string;
  storeId: string;
  storeName: string;
  storeSlug: string;
  tenantId: string;
  tenantName: string;
};

export type AccountApi = {
  bootstrap: () => Promise<SessionBootstrap>;
  createAgency: (input: CreateAgencyInput) => Promise<ProvisionedAgency>;
  createAgencyStore: (
    input: CreateAgencyStoreInput,
  ) => Promise<ProvisionedStore>;
  createOwnerStore: (input: CreateOwnerStoreInput) => Promise<ProvisionedStore>;
  resendInvitation: (invitationId: string) => Promise<IdentityInvitation>;
};

export function createAccountApi(options: {
  auth?: AccountAuth;
  baseUrl?: string;
  fetch: typeof fetch;
}): AccountApi {
  const auth = options.auth ?? {};
  return {
    bootstrap: () =>
      options
        .fetch(endpoint("/session/bootstrap", options.baseUrl), {
          headers: headers(auth),
        })
        .then(readJson<SessionBootstrap>),
    createAgency: (input) =>
      post(options, "/admin/agencies", input).then(
        readJson<Awaited<ReturnType<AccountApi["createAgency"]>>>,
      ),
    createAgencyStore: (input) =>
      post(options, "/agency/stores", input).then(readJson<ProvisionedStore>),
    createOwnerStore: (input) =>
      post(options, "/onboarding/owner-store", input).then(
        readJson<ProvisionedStore>,
      ),
    resendInvitation: (invitationId) =>
      post(
        options,
        `/identity/invitations/${encodeURIComponent(invitationId)}/resend`,
        undefined,
      ).then(readJson<IdentityInvitation>),
  };
}

function post(
  options: { auth?: AccountAuth; baseUrl?: string; fetch: typeof fetch },
  path: string,
  body: unknown,
) {
  return options.fetch(endpoint(path, options.baseUrl), {
    body: JSON.stringify(body),
    headers: headers(options.auth ?? {}),
    method: "POST",
  });
}

function headers(auth: AccountAuth): HeadersInit {
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
  return readApiJson<T>(response, { feature: "Conta" });
}
