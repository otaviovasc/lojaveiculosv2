import { readApiJson } from "../../lib/apiErrors";
import type {
  SettingsAuth,
  IdentityInvitationView,
  InviteStoreMemberInput,
  RoleManagementView,
  StoreMemberOptionsView,
  StoreSettingsSnapshot,
  UpdateMembershipAccessInput,
  UpdateStoreSettingsInput,
} from "./types";

export type SettingsApi = {
  getStoreSettings: () => Promise<StoreSettingsSnapshot>;
  getStoreMemberOptions: () => Promise<StoreMemberOptionsView>;
  updateStoreSettings: (
    input: UpdateStoreSettingsInput,
  ) => Promise<StoreSettingsSnapshot>;
  getRoleManagement: () => Promise<RoleManagementView>;
  updateMembershipAccess: (
    membershipId: string,
    input: UpdateMembershipAccessInput,
  ) => Promise<RoleManagementView>;
  inviteStoreMember: (
    input: InviteStoreMemberInput,
  ) => Promise<IdentityInvitationView>;
  resendInvitation: (invitationId: string) => Promise<IdentityInvitationView>;
};

export type CreateSettingsApiOptions = {
  auth?: SettingsAuth;
  baseUrl?: string;
  fetch: typeof fetch;
};

export function createSettingsApi({
  auth = {},
  baseUrl,
  fetch,
}: CreateSettingsApiOptions): SettingsApi {
  return {
    getStoreMemberOptions: () =>
      fetch(settingsRoutes.memberOptions(baseUrl), {
        headers: createSettingsHeaders(auth),
      }).then(readJson<StoreMemberOptionsView>),
    getStoreSettings: () =>
      fetch(settingsRoutes.store(baseUrl), {
        headers: createSettingsHeaders(auth),
      }).then(readJson<StoreSettingsSnapshot>),
    updateStoreSettings: (input) =>
      fetch(settingsRoutes.store(baseUrl), {
        body: JSON.stringify(cleanJson(input)),
        headers: createSettingsHeaders(auth),
        method: "PATCH",
      }).then(readJson<StoreSettingsSnapshot>),
    getRoleManagement: () =>
      fetch(settingsRoutes.roles(baseUrl), {
        headers: createSettingsHeaders(auth),
      }).then(readJson<RoleManagementView>),
    updateMembershipAccess: (membershipId, input) =>
      fetch(settingsRoutes.membershipAccess(membershipId, baseUrl), {
        body: JSON.stringify(input),
        headers: createSettingsHeaders(auth),
        method: "PATCH",
      }).then(readJson<RoleManagementView>),
    inviteStoreMember: (input) =>
      fetch(settingsRoutes.invitations(baseUrl), {
        body: JSON.stringify(input),
        headers: createSettingsHeaders(auth),
        method: "POST",
      }).then(readJson<IdentityInvitationView>),
    resendInvitation: (invitationId) =>
      fetch(settingsRoutes.resendInvitation(invitationId, baseUrl), {
        headers: createSettingsHeaders(auth),
        method: "POST",
      }).then(readJson<IdentityInvitationView>),
  };
}

export const settingsRoutes = {
  memberOptions: (baseUrl?: string) =>
    createSettingsEndpoint("/identity/member-options", baseUrl),
  membershipAccess: (membershipId: string, baseUrl?: string) =>
    createSettingsEndpoint(
      `/identity/memberships/${encodeURIComponent(membershipId)}/access`,
      baseUrl,
    ),
  roles: (baseUrl?: string) =>
    createSettingsEndpoint("/identity/roles", baseUrl),
  invitations: (baseUrl?: string) =>
    createSettingsEndpoint("/identity/invitations", baseUrl),
  resendInvitation: (invitationId: string, baseUrl?: string) =>
    createSettingsEndpoint(
      `/identity/invitations/${encodeURIComponent(invitationId)}/resend`,
      baseUrl,
    ),
  store: (baseUrl?: string) =>
    createSettingsEndpoint("/settings/store", baseUrl),
} as const;

function createSettingsHeaders(auth: SettingsAuth): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (auth.accessToken) headers.Authorization = `Bearer ${auth.accessToken}`;
  if (auth.clerkUserId) headers["x-clerk-user-id"] = auth.clerkUserId;
  if (auth.storeSlug) headers["x-store-slug"] = auth.storeSlug;
  return headers;
}

function createSettingsEndpoint(path: string, baseUrl = "/api/v1") {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

async function readJson<T>(response: Response): Promise<T> {
  return readApiJson<T>(response, { feature: "Configuracoes" });
}

function cleanJson(input: UpdateStoreSettingsInput) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  );
}
