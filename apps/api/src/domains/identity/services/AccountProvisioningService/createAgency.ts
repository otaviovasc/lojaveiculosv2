import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import { assertPermission } from "../../../../shared/authorization.js";
import type { ClerkUserProfile } from "../../ports/accountProvisioningRepository.js";
import {
  AccountProvisioningPolicyError,
  AccountProvisioningProviderError,
  assertVerifiedPrimaryEmail,
  auditInvitationSendFailure,
  normalizePublicSlug,
  requireClerkActor,
  type AccountProvisioningPorts,
} from "./serviceSupport.js";

export type CreateAgencyInput = {
  firstUser?: {
    email: string;
    name?: string | null;
  };
  tenantLegalName?: string | null;
  tenantSlug: string;
  tenantTradingName: string;
};

export async function createAgency(
  context: ServiceContext,
  profile: ClerkUserProfile,
  input: CreateAgencyInput,
  ports: AccountProvisioningPorts,
) {
  requireClerkActor(context);
  assertVerifiedPrimaryEmail(profile);
  const actor = await ports.accountProvisioningRepository.ensureUser(profile);
  const isAdmin =
    await ports.accountProvisioningRepository.hasActivePlatformAdmin(actor.id);

  assertPermission(context, "tenant.manage");
  if (!isAdmin) {
    throw new AccountProvisioningPolicyError(
      "Only platform admins can create agency accounts.",
    );
  }

  const tenantSlug = normalizePublicSlug(input.tenantSlug);
  context.logger.info(
    "identity.agency.create.started",
    createServiceLogMetadata(context, { tenantSlug }),
  );

  const agency = await ports.accountProvisioningRepository.createAgency({
    ...(input.firstUser ? { firstUser: input.firstUser } : {}),
    invitedByUserId: actor.id,
    tenantLegalName: input.tenantLegalName ?? null,
    tenantSlug,
    tenantTradingName: input.tenantTradingName.trim(),
  });
  let invitationStatus = agency.invitationStatus;
  if (input.firstUser && agency.invitationId) {
    try {
      const sent = await ports.invitationSender.send({
        email: input.firstUser.email.trim().toLowerCase(),
        invitationId: agency.invitationId,
        metadata: {
          invitationId: agency.invitationId,
          role: "agency",
          tenantId: agency.tenantId,
        },
      });
      const updated =
        await ports.accountProvisioningRepository.markInvitationSent({
          allowedStatuses: ["pending"],
          clerkInvitationId: sent.clerkInvitationId ?? null,
          invitationId: agency.invitationId,
        });
      if (!updated) {
        throw new AccountProvisioningProviderError(
          "Agency invitation status changed before Clerk send completion.",
        );
      }
      invitationStatus = "sent";
    } catch (error) {
      await ports.accountProvisioningRepository.markInvitationSendFailed({
        invitationId: agency.invitationId,
      });
      invitationStatus = "send_failed";
      context.logger.warn(
        "identity.agency.invitation.send_failed",
        createServiceLogMetadata(context, {
          invitationId: agency.invitationId,
          tenantId: agency.tenantId,
        }),
      );
      await auditInvitationSendFailure(context, {
        action: "identity.agency.invitation.send",
        actor: { ...context.actor, id: actor.id },
        invitationId: agency.invitationId,
        role: "agency",
        storeId: null,
        summary: "Agency first-user invitation failed to send through Clerk",
        tenantId: agency.tenantId,
      });
      context.logger.warn(
        "identity.agency.invitation.send_failed.reason",
        createServiceLogMetadata(context, {
          errorName: error instanceof Error ? error.name : "UnknownError",
          invitationId: agency.invitationId,
        }),
      );
    }
  }

  await context.audit.record({
    action: "identity.agency.create",
    actor: { ...context.actor, id: actor.id },
    category: "authorization",
    criticality: "critical",
    entityId: agency.tenantId,
    entityType: "tenant",
    metadata: {
      firstInvitationId: agency.invitationId,
      firstInvitationStatus: invitationStatus,
      tenantSlug: agency.tenantSlug,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: null,
    summary: "Created agency tenant from platform admin dashboard",
    tenantId: agency.tenantId,
  });

  return {
    ...agency,
    invitationStatus,
  };
}
