import { createClerkClient } from "@clerk/backend";
import type {
  ClerkUserProfile,
  InvitationSender,
} from "../../domains/identity/ports/accountProvisioningRepository.js";
import { AccountProvisioningProviderError } from "../../domains/identity/services/AccountProvisioningService/serviceSupport.js";

export type ClerkUserProfileProvider = {
  getProfile: (clerkUserId: string) => Promise<ClerkUserProfile>;
};

export function createClerkUserProfileProvider(options: {
  secretKey: string;
}): ClerkUserProfileProvider {
  const client = createClerkClient({ secretKey: options.secretKey });
  return {
    async getProfile(clerkUserId) {
      let user: Awaited<ReturnType<typeof client.users.getUser>>;
      try {
        user = await client.users.getUser(clerkUserId);
      } catch {
        throw new AccountProvisioningProviderError(
          "Clerk profile lookup failed.",
        );
      }
      const primaryEmail = user.primaryEmailAddress;
      const email = primaryEmail?.emailAddress;
      if (!email || !primaryEmail) {
        throw new AccountProvisioningProviderError(
          "Clerk user is missing primary email.",
        );
      }
      return {
        clerkUserId: user.id,
        email,
        emailVerified: primaryEmail.verification?.status === "verified",
        name: user.fullName,
      };
    },
  };
}

export function createClerkInvitationSender(options: {
  redirectUrl?: string;
  secretKey: string;
}): InvitationSender {
  const client = createClerkClient({ secretKey: options.secretKey });
  return {
    async send(input) {
      const invitation = await client.invitations.createInvitation({
        emailAddress: input.email,
        notify: true,
        publicMetadata: input.metadata,
        ...(options.redirectUrl ? { redirectUrl: options.redirectUrl } : {}),
      });
      return { clerkInvitationId: invitation.id };
    },
  };
}
