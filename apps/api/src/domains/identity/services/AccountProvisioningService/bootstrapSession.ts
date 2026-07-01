import {
  createServiceLogMetadata,
  type ServiceContext,
} from "../../../../shared/serviceContext.js";
import { assertPermission } from "../../../../shared/authorization.js";
import type { ClerkUserProfile } from "../../ports/accountProvisioningRepository.js";
import {
  assertVerifiedPrimaryEmail,
  requireClerkActor,
  type AccountProvisioningPorts,
} from "./serviceSupport.js";

export async function bootstrapSession(
  context: ServiceContext,
  profile: ClerkUserProfile,
  ports: AccountProvisioningPorts,
) {
  requireClerkActor(context);
  assertVerifiedPrimaryEmail(profile);
  assertPermission(context, "identity.session.bootstrap");
  context.logger.info(
    "identity.session.bootstrap.started",
    createServiceLogMetadata(context),
  );

  const bootstrap =
    await ports.accountProvisioningRepository.findSessionBootstrap(profile);

  for (const invitation of bootstrap.acceptedInvitations) {
    await context.audit.record({
      action: "identity.invitation.accept",
      actor: {
        ...context.actor,
        id: bootstrap.user.id,
      },
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
      storeId: invitation.storeId,
      summary: "Accepted identity invitation during session bootstrap",
      tenantId: invitation.tenantId,
    });
  }

  await context.audit.record({
    action: "identity.session.bootstrap",
    actor: {
      ...context.actor,
      id: bootstrap.user.id,
    },
    category: "authentication",
    entityId: bootstrap.user.id,
    entityType: "user",
    metadata: {
      platformAdmin: bootstrap.platformAdmin,
      storeCount: bootstrap.stores.length,
      tenantMembershipCount: bootstrap.tenantMemberships.length,
    },
    outcome: "succeeded",
    requestId: context.requestId,
    storeId: null,
    summary: "Bootstrapped authenticated V2 session",
    tenantId: null,
  });

  return bootstrap;
}
