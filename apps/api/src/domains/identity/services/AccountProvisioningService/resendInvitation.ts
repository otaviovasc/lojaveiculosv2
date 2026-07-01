import type { StoreId, UserId } from "@lojaveiculosv2/shared";
import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import {
  AccountProvisioningConflictError,
  type ClerkUserProfile,
  type IdentityInvitationRecord,
} from "../../ports/accountProvisioningRepository.js";
import {
  AccountProvisioningPolicyError,
  AccountProvisioningProviderError,
  assertVerifiedPrimaryEmail,
  auditInvitationSendFailure,
  requireClerkActor,
  type AccountProvisioningPorts,
} from "./serviceSupport.js";

export type ResendInvitationInput = {
  invitationId: string;
};

export async function resendInvitation(
  context: ServiceContext,
  profile: ClerkUserProfile,
  input: ResendInvitationInput,
  ports: AccountProvisioningPorts,
) {
  requireClerkActor(context);
  assertVerifiedPrimaryEmail(profile);
  const actor = await ports.accountProvisioningRepository.ensureUser(profile);
  const invitation =
    await ports.accountProvisioningRepository.findInvitationById(
      input.invitationId,
    );
  if (!invitation) {
    throw new AccountProvisioningConflictError("Invitation not found.");
  }
  assertResendable(invitation);
  await assertCanResendInvitation(context, actor.id, invitation, ports);

  context.logger.info(
    "identity.invitation.resend.started",
    createServiceLogMetadata(context, {
      invitationId: invitation.id,
      storeId: invitation.storeId,
      tenantId: invitation.tenantId,
    }),
  );

  let sent: { clerkInvitationId?: string | null };
  try {
    sent = await ports.invitationSender.send({
      email: invitation.email,
      invitationId: invitation.id,
      metadata: {
        invitationId: invitation.id,
        resend: true,
        role: invitation.role,
        storeId: invitation.storeId,
        tenantId: invitation.tenantId,
      },
    });
  } catch (error) {
    await ports.accountProvisioningRepository.markInvitationSendFailed({
      invitationId: invitation.id,
    });
    await auditInvitationSendFailure(context, {
      action: "identity.invitation.resend",
      actor: { ...context.actor, id: actor.id },
      invitationId: invitation.id,
      role: invitation.role,
      storeId: invitation.storeId,
      summary: "Identity invitation resend failed through Clerk",
      tenantId: invitation.tenantId,
    });
    if (error instanceof AccountProvisioningProviderError) throw error;
    throw new AccountProvisioningProviderError(
      "Identity invitation could not be resent.",
    );
  }

  const updated = await ports.accountProvisioningRepository.markInvitationSent({
    allowedStatuses: ["expired", "pending", "send_failed", "sent"],
    clerkInvitationId: sent.clerkInvitationId ?? null,
    invitationId: invitation.id,
  });
  if (!updated) {
    throw new AccountProvisioningConflictError(
      "Invitation status changed before resend completion.",
    );
  }

  await context.audit.record({
    action: "identity.invitation.resend",
    actor: { ...context.actor, id: actor.id },
    category: "authorization",
    criticality: "critical",
    entityId: invitation.id,
    entityType: "identity_invitation",
    metadata: {
      provider: "clerk",
      role: invitation.role,
      storeId: invitation.storeId,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: invitation.storeId,
    summary: "Resent identity invitation through Clerk",
    tenantId: invitation.tenantId,
  });

  return {
    ...invitation,
    status: "sent" as const,
  };
}

function assertResendable(invitation: IdentityInvitationRecord) {
  if (invitation.status === "accepted" || invitation.status === "revoked") {
    throw new AccountProvisioningConflictError(
      `Cannot resend ${invitation.status} invitation.`,
    );
  }
}

async function assertCanResendInvitation(
  context: ServiceContext,
  userId: string,
  invitation: IdentityInvitationRecord,
  ports: AccountProvisioningPorts,
) {
  if (invitation.storeId) {
    const canManageStore =
      await ports.accountProvisioningRepository.hasStorePermission({
        permission: "users.manage",
        storeId: invitation.storeId as StoreId,
        userId: userId as UserId,
      });
    assertPermission(
      {
        ...context,
        permissions: canManageStore ? ["users.manage"] : [],
        storeId: invitation.storeId,
        tenantId: invitation.tenantId,
      },
      "users.manage",
    );
    return;
  }

  const isPlatformAdmin =
    await ports.accountProvisioningRepository.hasActivePlatformAdmin(
      userId as UserId,
    );
  if (!isPlatformAdmin) {
    throw new AccountProvisioningPolicyError(
      "Only platform admins can resend tenant invitations.",
    );
  }
  assertPermission(context, "tenant.manage");
}
