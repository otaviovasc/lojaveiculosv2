import { assertPermission } from "../../../../shared/authorization.js";
import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type {
  CrmCampaign,
  CrmCampaignStatus,
} from "../../ports/crmConversationRepository.js";
import { CrmCampaignNotFoundError } from "../../messaging/crmMessagingErrors.js";
import {
  getCrmConversationRepository,
  requireCrmMessagingScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  logCrmServiceEvent,
  recordCrmServiceMutation,
} from "./serviceSupport.js";
import {
  campaignManagePermission,
  type CrmCampaignIdInput,
} from "../../messaging/crmCampaignTypes.js";
import { cancelPendingCampaignMessages } from "../../messaging/crmCampaignSupport.js";

export async function cancelCrmCampaign(
  context: ServiceContext,
  input: CrmCampaignIdInput,
  ports: CrmServicePorts,
): Promise<CrmCampaign> {
  assertPermission(context, campaignManagePermission);
  return updateCampaignLifecycle(context, input, "cancelled", ports);
}

export async function pauseCrmCampaign(
  context: ServiceContext,
  input: CrmCampaignIdInput,
  ports: CrmServicePorts,
): Promise<CrmCampaign> {
  assertPermission(context, campaignManagePermission);
  return updateCampaignLifecycle(context, input, "paused", ports);
}

export async function resumeCrmCampaign(
  context: ServiceContext,
  input: CrmCampaignIdInput,
  ports: CrmServicePorts,
): Promise<CrmCampaign> {
  assertPermission(context, campaignManagePermission);
  return updateCampaignLifecycle(context, input, "scheduled", ports);
}

async function updateCampaignLifecycle(
  context: ServiceContext,
  input: CrmCampaignIdInput,
  status: Extract<CrmCampaignStatus, "cancelled" | "paused" | "scheduled">,
  ports: CrmServicePorts,
) {
  const scope = requireCrmMessagingScope(context);
  logCrmServiceEvent(context, `crm.campaign.${status}.started`, {
    campaignId: input.campaignId,
  });
  return recordCrmServiceMutation(
    context,
    {
      action: `crm.campaign.${status}`,
      category: "data_change",
      entityId: input.campaignId,
      entityType: "crm_campaign",
      permission: campaignManagePermission,
      summary: "Updated CRM WhatsApp campaign lifecycle",
    },
    async () => {
      const repository = getCrmConversationRepository(ports);
      const campaign = await repository.updateCampaign({
        campaignId: input.campaignId,
        status,
        storeId: scope.storeId as never,
        tenantId: scope.tenantId as never,
      });
      if (!campaign) throw new CrmCampaignNotFoundError(input.campaignId);
      if (status === "cancelled") {
        await cancelPendingCampaignMessages(repository, campaign);
      }
      return campaign;
    },
  );
}
