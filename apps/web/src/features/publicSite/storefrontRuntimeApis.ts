import { createSettingsApi, type SettingsApi } from "../settings/apiClient";
import { createSettingsApiOptions } from "../settings/runtimeApi";
import {
  createStorefrontPagesApi,
  type StorefrontPagesApi,
} from "./storefrontPagesApi";
import {
  createStorefrontMediaApi,
  type StorefrontMediaApi,
} from "./storefrontMediaApi";

export function createRuntimeSettingsApi(): SettingsApi {
  return {
    getStoreSettings: async () =>
      createSettingsApi(await createSettingsApiOptions()).getStoreSettings(),
    getRoleManagement: async () =>
      createSettingsApi(await createSettingsApiOptions()).getRoleManagement(),
    inviteStoreMember: async (input) =>
      createSettingsApi(await createSettingsApiOptions()).inviteStoreMember(
        input,
      ),
    resendInvitation: async (invitationId) =>
      createSettingsApi(await createSettingsApiOptions()).resendInvitation(
        invitationId,
      ),
    updateMembershipAccess: async (membershipId, input) =>
      createSettingsApi(
        await createSettingsApiOptions(),
      ).updateMembershipAccess(membershipId, input),
    updateStoreSettings: async (input) =>
      createSettingsApi(await createSettingsApiOptions()).updateStoreSettings(
        input,
      ),
  };
}

export function createRuntimeStorefrontPagesApi(): StorefrontPagesApi {
  return {
    createPage: async (input) =>
      createStorefrontPagesApi(await createSettingsApiOptions()).createPage(
        input,
      ),
    deletePage: async (pageId) =>
      createStorefrontPagesApi(await createSettingsApiOptions()).deletePage(
        pageId,
      ),
    getPage: async (pageId) =>
      createStorefrontPagesApi(await createSettingsApiOptions()).getPage(
        pageId,
      ),
    listPages: async () =>
      createStorefrontPagesApi(await createSettingsApiOptions()).listPages(),
    updatePage: async (pageId, input) =>
      createStorefrontPagesApi(await createSettingsApiOptions()).updatePage(
        pageId,
        input,
      ),
  };
}

export function createRuntimeStorefrontMediaApi(): StorefrontMediaApi {
  return {
    listAssets: async () =>
      createStorefrontMediaApi(await createSettingsApiOptions()).listAssets(),
    uploadImage: async (input) =>
      createStorefrontMediaApi(await createSettingsApiOptions()).uploadImage(
        input,
      ),
  };
}
