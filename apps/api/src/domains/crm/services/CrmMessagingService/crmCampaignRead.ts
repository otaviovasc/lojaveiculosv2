import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { CrmCampaignNotFoundError } from "../../messaging/crmMessagingErrors.js";
import {
  getCrmConversationRepository,
  requireCrmMessagingScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  campaignReadPermission,
  type CrmCampaignDetail,
  type CrmCampaignIdInput,
} from "../../messaging/crmCampaignTypes.js";
import { auditCrmServiceEvent, logCrmServiceEvent } from "./serviceSupport.js";

export async function getCrmCampaignDetail(
  context: ServiceContext,
  input: CrmCampaignIdInput,
  ports: CrmServicePorts,
): Promise<CrmCampaignDetail> {
  assertPermission(context, campaignReadPermission);
  const scope = requireCrmMessagingScope(context);
  const repository = getCrmConversationRepository(ports);
  logCrmServiceEvent(context, "crm.campaign.detail.started", {
    campaignId: input.campaignId,
  });
  const campaign = await repository.findCampaignById({
    campaignId: input.campaignId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!campaign) throw new CrmCampaignNotFoundError(input.campaignId);
  const recipients = await repository.listCampaignRecipients({
    campaignId: campaign.id,
    limit: 100,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  await auditCrmServiceEvent(context, {
    action: "crm.campaign.detail",
    category: "data_access",
    entityId: campaign.id,
    entityType: "crm_campaign",
    metadata: { recipientCount: recipients.length },
    permission: campaignReadPermission,
    summary: "Read CRM WhatsApp campaign detail",
  });
  return { campaign, recipients };
}
