import { createClerkClient } from "@clerk/backend";
import type {
  ClerkUserProfile,
  InvitationSender,
} from "../../domains/identity/ports/accountProvisioningRepository.js";
import {
  AccountProvisioningProviderError,
  type AccountProvisioningProviderErrorDetails,
} from "../../domains/identity/services/AccountProvisioningService/serviceSupport.js";

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
      try {
        const invitation = await client.invitations.createInvitation({
          emailAddress: input.email,
          notify: true,
          publicMetadata: input.metadata,
          ...(options.redirectUrl ? { redirectUrl: options.redirectUrl } : {}),
        });
        return {
          acceptUrl: invitation.url ?? null,
          clerkInvitationId: invitation.id,
        };
      } catch (error) {
        throw toInvitationProviderError(error);
      }
    },
  };
}

function toInvitationProviderError(
  error: unknown,
): AccountProvisioningProviderError {
  const details = readClerkErrorDetails(error);
  const codes = details.providerErrorCodes?.join(", ");
  const status = details.providerStatus ?? "unknown";
  return new AccountProvisioningProviderError(
    codes
      ? `Clerk invitation request rejected (status ${status}: ${codes}).`
      : `Clerk invitation request failed (status ${status}).`,
    details,
  );
}

function readClerkErrorDetails(
  error: unknown,
): AccountProvisioningProviderErrorDetails {
  if (!error || typeof error !== "object") return {};
  const record = error as Record<string, unknown>;
  const providerStatus =
    typeof record.status === "number" ? record.status : undefined;
  const clerkTraceId =
    typeof record.clerkTraceId === "string" ? record.clerkTraceId : undefined;
  const providerErrorCodes = Array.isArray(record.errors)
    ? record.errors
        .map((item) =>
          item && typeof item === "object"
            ? (item as Record<string, unknown>).code
            : undefined,
        )
        .filter((code): code is string => typeof code === "string")
    : undefined;
  return {
    ...(clerkTraceId ? { clerkTraceId } : {}),
    ...(providerErrorCodes?.length ? { providerErrorCodes } : {}),
    ...(providerStatus !== undefined ? { providerStatus } : {}),
  };
}
