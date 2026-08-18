import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmCampaign } from "../../../domains/crm/ports/crmConversationRepository.js";
import type {
  CreateCrmCampaignInput,
  ListCrmCampaignsInput,
  CrmCampaignDetail,
  CrmCampaignIdInput,
} from "../../../domains/crm/messaging/crmCampaignTypes.js";
import {
  createCrmCampaign,
  listCrmCampaigns,
} from "../../../domains/crm/services/CrmMessagingService/crmCampaignCreate.js";
import { getCrmCampaignDetail } from "../../../domains/crm/services/CrmMessagingService/crmCampaignRead.js";
import {
  cancelCrmCampaign,
  pauseCrmCampaign,
  resumeCrmCampaign,
} from "../../../domains/crm/services/CrmMessagingService/crmCampaignLifecycle.js";
import type { CrmServicePorts } from "../../../domains/crm/services/CrmService/serviceSupport.js";

type CrmContextService<Input, Output> = (
  context: ServiceContext,
  input: Input,
) => Promise<Output>;

export type CrmCampaignServices = {
  cancelCrmCampaign: CrmContextService<CrmCampaignIdInput, CrmCampaign>;
  createCrmCampaign: CrmContextService<CreateCrmCampaignInput, CrmCampaign>;
  getCrmCampaignDetail: CrmContextService<
    CrmCampaignIdInput,
    CrmCampaignDetail
  >;
  listCrmCampaigns: CrmContextService<
    ListCrmCampaignsInput,
    readonly CrmCampaign[]
  >;
  pauseCrmCampaign: CrmContextService<CrmCampaignIdInput, CrmCampaign>;
  resumeCrmCampaign: CrmContextService<CrmCampaignIdInput, CrmCampaign>;
};

export function createCrmCampaignBindings(
  ports: CrmServicePorts,
): CrmCampaignServices {
  return {
    cancelCrmCampaign: (context, input) =>
      cancelCrmCampaign(context, input, ports),
    createCrmCampaign: (context, input) =>
      createCrmCampaign(context, input, ports),
    getCrmCampaignDetail: (context, input) =>
      getCrmCampaignDetail(context, input, ports),
    listCrmCampaigns: (context, input) =>
      listCrmCampaigns(context, input, ports),
    pauseCrmCampaign: (context, input) =>
      pauseCrmCampaign(context, input, ports),
    resumeCrmCampaign: (context, input) =>
      resumeCrmCampaign(context, input, ports),
  };
}
