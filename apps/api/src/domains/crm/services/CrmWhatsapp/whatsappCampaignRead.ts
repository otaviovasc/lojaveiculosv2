import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import { WhatsappCampaignNotFoundError } from "../../whatsapp/whatsappSendErrors.js";
import {
  getCrmWhatsappRepository,
  requireCrmWhatsappScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  campaignReadPermission,
  type WhatsappCampaignDetail,
  type WhatsappCampaignIdInput,
} from "../../whatsapp/whatsappCampaignTypes.js";
import {
  auditWhatsappServiceEvent,
  logWhatsappServiceEvent,
} from "./serviceSupport.js";

export async function getWhatsappCampaignDetail(
  context: ServiceContext,
  input: WhatsappCampaignIdInput,
  ports: CrmServicePorts,
): Promise<WhatsappCampaignDetail> {
  assertPermission(context, campaignReadPermission);
  const scope = requireCrmWhatsappScope(context);
  const repository = getCrmWhatsappRepository(ports);
  logWhatsappServiceEvent(context, "crm.whatsapp.campaign.detail.started", {
    campaignId: input.campaignId,
  });
  const campaign = await repository.findCampaignById({
    campaignId: input.campaignId,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  if (!campaign) throw new WhatsappCampaignNotFoundError(input.campaignId);
  const recipients = await repository.listCampaignRecipients({
    campaignId: campaign.id,
    limit: 100,
    storeId: scope.storeId as never,
    tenantId: scope.tenantId as never,
  });
  await auditWhatsappServiceEvent(context, {
    action: "crm.whatsapp.campaign.detail",
    category: "data_access",
    entityId: campaign.id,
    entityType: "crm_whatsapp_campaign",
    metadata: { recipientCount: recipients.length },
    permission: campaignReadPermission,
    summary: "Read CRM WhatsApp campaign detail",
  });
  return { campaign, recipients };
}
