import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  CrmWhatsappCampaign,
  CrmWhatsappCampaignStatus,
} from "../../ports/crmWhatsappRepository.js";
import { WhatsappCampaignNotFoundError } from "../../whatsapp/whatsappSendErrors.js";
import {
  getCrmWhatsappRepository,
  requireCrmWhatsappScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  logWhatsappServiceEvent,
  recordWhatsappServiceMutation,
} from "./serviceSupport.js";
import {
  campaignManagePermission,
  type WhatsappCampaignIdInput,
} from "../../whatsapp/whatsappCampaignTypes.js";
import { cancelPendingCampaignMessages } from "../../whatsapp/whatsappCampaignSupport.js";

export async function cancelWhatsappCampaign(
  context: ServiceContext,
  input: WhatsappCampaignIdInput,
  ports: CrmServicePorts,
): Promise<CrmWhatsappCampaign> {
  assertPermission(context, campaignManagePermission);
  return updateCampaignLifecycle(context, input, "cancelled", ports);
}

export async function pauseWhatsappCampaign(
  context: ServiceContext,
  input: WhatsappCampaignIdInput,
  ports: CrmServicePorts,
): Promise<CrmWhatsappCampaign> {
  assertPermission(context, campaignManagePermission);
  return updateCampaignLifecycle(context, input, "paused", ports);
}

export async function resumeWhatsappCampaign(
  context: ServiceContext,
  input: WhatsappCampaignIdInput,
  ports: CrmServicePorts,
): Promise<CrmWhatsappCampaign> {
  assertPermission(context, campaignManagePermission);
  return updateCampaignLifecycle(context, input, "scheduled", ports);
}

async function updateCampaignLifecycle(
  context: ServiceContext,
  input: WhatsappCampaignIdInput,
  status: Extract<
    CrmWhatsappCampaignStatus,
    "cancelled" | "paused" | "scheduled"
  >,
  ports: CrmServicePorts,
) {
  const scope = requireCrmWhatsappScope(context);
  logWhatsappServiceEvent(context, `crm.whatsapp.campaign.${status}.started`, {
    campaignId: input.campaignId,
  });
  return recordWhatsappServiceMutation(
    context,
    {
      action: `crm.whatsapp.campaign.${status}`,
      category: "data_change",
      entityId: input.campaignId,
      entityType: "crm_whatsapp_campaign",
      permission: campaignManagePermission,
      summary: "Updated CRM WhatsApp campaign lifecycle",
    },
    async () => {
      const repository = getCrmWhatsappRepository(ports);
      const campaign = await repository.updateCampaign({
        campaignId: input.campaignId,
        status,
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
      });
      if (!campaign) throw new WhatsappCampaignNotFoundError(input.campaignId);
      if (status === "cancelled") {
        await cancelPendingCampaignMessages(repository, campaign);
      }
      return campaign;
    },
  );
}
