import type { RoleKey } from "@lojaveiculosv2/shared";
import { assertPermission } from "../../../../shared/authorization.js";
import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import {
  AccountProvisioningProviderError,
  AccountProvisioningScopeError,
  assertAssignableStoreInviteRole,
  assertStoreInviteRoleAllowedByActor,
  auditInvitationSendFailure,
  type AccountProvisioningPorts,
} from "./serviceSupport.js";

export type InviteStoreMemberInput = {
  email: string;
  name?: string | null;
  role: RoleKey;
};

export async function inviteStoreMember(
  context: ServiceContext,
  input: InviteStoreMemberInput,
  ports: AccountProvisioningPorts,
) {
  assertPermission(context, "users.manage");
  if (!context.storeId || !context.tenantId) {
    throw new AccountProvisioningScopeError(
      "Store invitation requires resolved store scope.",
    );
  }
  assertAssignableStoreInviteRole(input.role);
  const actorStoreRole =
    await ports.accountProvisioningRepository.findActiveStoreRole({
      storeId: context.storeId as never,
      userId: context.actor.id as never,
    });
  assertStoreInviteRoleAllowedByActor(actorStoreRole, input.role);
  await ports.quotaGuard?.assertAvailable({
    quotaKey: "seller",
    storeId: context.storeId,
    tenantId: context.tenantId,
  });

  context.logger.info(
    "identity.store_invitation.create.started",
    createServiceLogMetadata(context, {
      role: input.role,
    }),
  );

  const invitation =
    await ports.accountProvisioningRepository.createStoreInvitation({
      email: input.email.trim().toLowerCase(),
      invitedByUserId: context.actor.id as never,
      name: input.name ?? null,
      role: input.role,
      storeId: context.storeId as never,
      tenantId: context.tenantId as never,
    });
  try {
    const sent = await ports.invitationSender.send({
      email: invitation.email,
      invitationId: invitation.id,
      metadata: {
        invitationId: invitation.id,
        role: invitation.role,
        storeId: invitation.storeId,
        tenantId: invitation.tenantId,
      },
    });
    const updated =
      await ports.accountProvisioningRepository.markInvitationSent({
        allowedStatuses: ["pending"],
        clerkInvitationId: sent.clerkInvitationId ?? null,
        invitationId: invitation.id,
      });
    if (!updated) {
      throw new AccountProvisioningProviderError(
        "Invitation status changed before Clerk send completion.",
      );
    }
  } catch (error) {
    await ports.accountProvisioningRepository.markInvitationSendFailed({
      invitationId: invitation.id,
    });
    await auditInvitationSendFailure(context, {
      action: "identity.store_invitation.send",
      invitationId: invitation.id,
      role: invitation.role,
      storeId: invitation.storeId,
      summary: "Store member invitation failed to send through Clerk",
      tenantId: invitation.tenantId,
    });
    context.logger.warn(
      "identity.store_invitation.send_failed",
      createServiceLogMetadata(context, {
        errorName: error instanceof Error ? error.name : "UnknownError",
        invitationId: invitation.id,
      }),
    );
    return {
      ...invitation,
      status: "send_failed" as const,
    };
  }

  await context.audit.record({
    action: "identity.store_invitation.create",
    actor: context.actor,
    category: "authorization",
    criticality: "critical",
    entityId: invitation.id,
    entityType: "identity_invitation",
    metadata: {
      role: invitation.role,
      storeId: invitation.storeId,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: context.storeId,
    summary: "Created store member invitation",
    tenantId: context.tenantId,
  });

  return {
    ...invitation,
    status: "sent" as const,
  };
}
