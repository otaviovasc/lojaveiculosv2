import { bootstrapSession } from "../../../domains/identity/services/AccountProvisioningService/bootstrapSession.js";
import { createAgency } from "../../../domains/identity/services/AccountProvisioningService/createAgency.js";
import { createAgencyStore } from "../../../domains/identity/services/AccountProvisioningService/createAgencyStore.js";
import { createOwnerStore } from "../../../domains/identity/services/AccountProvisioningService/createOwnerStore.js";
import { inviteStoreMember } from "../../../domains/identity/services/AccountProvisioningService/inviteStoreMember.js";
import { resendInvitation } from "../../../domains/identity/services/AccountProvisioningService/resendInvitation.js";
import type { AccountProvisioningPorts } from "../../../domains/identity/services/AccountProvisioningService/serviceSupport.js";
import type {
  AccountProvisioningRepository,
  InvitationSender,
} from "../../../domains/identity/ports/accountProvisioningRepository.js";

export class InvitationSenderUnavailableError extends Error {
  constructor() {
    super("Clerk invitation sender is not configured.");
    this.name = "InvitationSenderUnavailableError";
  }
}

export type AccountProvisioningServices = {
  bootstrapSession: typeof bootstrapSession;
  createAgency: typeof createAgency;
  createAgencyStore: typeof createAgencyStore;
  createOwnerStore: typeof createOwnerStore;
  inviteStoreMember: typeof inviteStoreMember;
  resendInvitation: typeof resendInvitation;
} & AccountProvisioningPorts;

export function createAccountProvisioningServices(input: {
  invitationSender?: InvitationSender;
  repository: AccountProvisioningRepository;
}): AccountProvisioningServices {
  return {
    accountProvisioningRepository: input.repository,
    bootstrapSession,
    createAgency,
    createAgencyStore,
    createOwnerStore,
    invitationSender: input.invitationSender ?? unavailableInvitationSender,
    inviteStoreMember,
    resendInvitation,
  };
}

const unavailableInvitationSender: InvitationSender = {
  send: async () => {
    throw new InvitationSenderUnavailableError();
  },
};
