import type { InvitationSender } from "../../domains/identity/ports/accountProvisioningRepository.js";
import type { CrmRealtimeBroker } from "../../domains/crm/ports/crmRealtimePublisher.js";
import type { ObjectStorage } from "../../shared/storage/objectStorage.js";
import type { ClerkUserProfileProvider } from "../auth/clerkAccountProvisioning.js";
import type { CreateAppOptions } from "../http/createApp.js";

export type RuntimeHttpAppOptionsInput = {
  auditDb: unknown | null;
  clerkAccountProviders?: {
    clerkUserProfileProvider?: ClerkUserProfileProvider;
    invitationSender?: InvitationSender;
  };
  crmRealtimeBroker: CrmRealtimeBroker;
  db: unknown;
  env: Record<string, string | undefined>;
  identityVerifier: CreateAppOptions["identityVerifier"] | null;
  objectStorage: ObjectStorage | null;
};
