import { createSettingsApi, type SettingsApi } from "./apiClient";
import { createSettingsApiOptions } from "./runtimeApi";

export function createRuntimeSettingsApi(): SettingsApi {
  return {
    getStoreMemberOptions: async () =>
      createSettingsApi(
        await createSettingsApiOptions(),
      ).getStoreMemberOptions(),
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
