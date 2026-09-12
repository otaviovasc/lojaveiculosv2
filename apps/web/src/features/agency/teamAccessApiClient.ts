import { readApiJson } from "../../lib/apiErrors";
import type {
  IdentityInvitationView,
  InviteStoreMemberInput,
  RoleManagementView,
  UpdateMembershipAccessInput,
} from "../settings/types";

export type AgencyTeamAccessAuth = {
  accessToken?: string;
  clerkUserId?: string;
  userEmail?: string;
  userName?: string;
};

export type AgencyTeamAccessStore = {
  storeId: string;
  storeName: string;
  storeSlug: string;
};

export type AgencyTeamAccessDirectory = {
  stores: readonly AgencyTeamAccessStore[];
  tenantId: string;
};

export type AgencyTeamAccessApi = {
  getDirectory: (tenantId: string) => Promise<AgencyTeamAccessDirectory>;
  getStoreAccess: (
    tenantId: string,
    storeId: string,
  ) => Promise<RoleManagementView>;
  inviteStoreMember: (
    tenantId: string,
    storeId: string,
    input: InviteStoreMemberInput,
  ) => Promise<IdentityInvitationView>;
  resendInvitation: (
    tenantId: string,
    storeId: string,
    invitationId: string,
  ) => Promise<IdentityInvitationView>;
  updateMembershipAccess: (
    tenantId: string,
    storeId: string,
    membershipId: string,
    input: UpdateMembershipAccessInput,
  ) => Promise<RoleManagementView>;
};

export function createAgencyTeamAccessApi(options: {
  auth?: AgencyTeamAccessAuth;
  baseUrl?: string;
  fetch: typeof fetch;
}): AgencyTeamAccessApi {
  const auth = options.auth ?? {};
  const request = <T>(path: string, init?: RequestInit) =>
    options.fetch.call(globalThis, path, init).then(readJson<T>);
  return {
    getDirectory: (tenantId) =>
      request<AgencyTeamAccessDirectory>(
        routes.directory(tenantId, options.baseUrl),
        { headers: headers(auth) },
      ),
    getStoreAccess: (tenantId, storeId) =>
      request<RoleManagementView>(
        routes.storeAccess(tenantId, storeId, options.baseUrl),
        { headers: headers(auth) },
      ),
    inviteStoreMember: (tenantId, storeId, input) =>
      request<IdentityInvitationView>(
        routes.invitations(tenantId, storeId, options.baseUrl),
        {
          body: JSON.stringify(input),
          headers: headers(auth),
          method: "POST",
        },
      ),
    resendInvitation: (tenantId, storeId, invitationId) =>
      request<IdentityInvitationView>(
        routes.resendInvitation(
          tenantId,
          storeId,
          invitationId,
          options.baseUrl,
        ),
        { headers: headers(auth), method: "POST" },
      ),
    updateMembershipAccess: (tenantId, storeId, membershipId, input) =>
      request<RoleManagementView>(
        routes.membership(tenantId, storeId, membershipId, options.baseUrl),
        {
          body: JSON.stringify(input),
          headers: headers(auth),
          method: "PATCH",
        },
      ),
  };
}

const routes = {
  directory: (tenantId: string, baseUrl?: string) =>
    endpoint(
      `/agency/tenants/${encodeURIComponent(tenantId)}/team-access`,
      baseUrl,
    ),
  invitations: (tenantId: string, storeId: string, baseUrl?: string) =>
    endpoint(`${storePath(tenantId, storeId)}/invitations`, baseUrl),
  membership: (
    tenantId: string,
    storeId: string,
    membershipId: string,
    baseUrl?: string,
  ) =>
    endpoint(
      `${storePath(tenantId, storeId)}/memberships/${encodeURIComponent(membershipId)}`,
      baseUrl,
    ),
  resendInvitation: (
    tenantId: string,
    storeId: string,
    invitationId: string,
    baseUrl?: string,
  ) =>
    endpoint(
      `${storePath(tenantId, storeId)}/invitations/${encodeURIComponent(invitationId)}/resend`,
      baseUrl,
    ),
  storeAccess: (tenantId: string, storeId: string, baseUrl?: string) =>
    endpoint(storePath(tenantId, storeId), baseUrl),
} as const;

function storePath(tenantId: string, storeId: string) {
  return `/agency/tenants/${encodeURIComponent(tenantId)}/stores/${encodeURIComponent(storeId)}/team-access`;
}

function headers(auth: AgencyTeamAccessAuth): HeadersInit {
  const result: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (auth.accessToken) result.Authorization = `Bearer ${auth.accessToken}`;
  if (auth.clerkUserId) result["x-clerk-user-id"] = auth.clerkUserId;
  if (auth.userEmail) result["x-user-email"] = auth.userEmail;
  if (auth.userName) result["x-user-name"] = auth.userName;
  return result;
}

function endpoint(path: string, baseUrl = "/api/v1") {
  return `${baseUrl.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

async function readJson<T>(response: Response): Promise<T> {
  return readApiJson<T>(response, { feature: "Acesso da equipe" });
}
