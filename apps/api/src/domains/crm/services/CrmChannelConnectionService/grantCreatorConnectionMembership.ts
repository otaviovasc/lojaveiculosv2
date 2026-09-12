import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import type { CrmServicePorts } from "../CrmService/serviceSupport.js";

/**
 * Grants the creating actor membership on direct WhatsApp connections so
 * inbound chats are visible to them without a manual "Atendentes com acesso"
 * grant. Membership gating only applies to direct WhatsApp brokers; meta_cloud
 * (composio) and non-whatsapp channels keep global visibility semantics.
 */
export async function grantCreatorConnectionMembership(
  context: ServiceContext,
  connection: CrmConnection,
  ports: CrmServicePorts,
): Promise<void> {
  if (connection.channel !== "whatsapp" || connection.broker !== "direct") {
    return;
  }
  const memberRepository = ports.crmConnectionMemberRepository;
  if (!memberRepository) {
    // The membership repository is always wired in the feature bindings, but
    // domain test-support ports legitimately omit it. Warn loudly instead of
    // silently leaving the creator without access to their own connection.
    context.logger.warn("crm.connection.member.creator_grant.skipped", {
      connectionId: connection.id,
      reason: "missing_crm_connection_member_repository",
      storeId: connection.storeId,
      tenantId: connection.tenantId,
    });
    return;
  }
  await memberRepository.grantMember({
    connectionId: connection.id,
    grantedBy: context.actor.kind === "user" ? context.actor.id : null,
    storeId: connection.storeId,
    tenantId: connection.tenantId,
    userId: context.actor.id as never,
  });
}
