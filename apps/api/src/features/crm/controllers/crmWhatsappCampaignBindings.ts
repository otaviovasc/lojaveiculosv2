import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmWhatsappCampaign } from "../../../domains/crm/ports/crmWhatsappRepository.js";
import type {
  CreateWhatsappCampaignInput,
  ListWhatsappCampaignsInput,
  WhatsappCampaignDetail,
  WhatsappCampaignIdInput,
} from "../../../domains/crm/whatsapp/whatsappCampaignTypes.js";
import {
  createWhatsappCampaign,
  listWhatsappCampaigns,
} from "../../../domains/crm/services/CrmWhatsapp/whatsappCampaignCreate.js";
import { getWhatsappCampaignDetail } from "../../../domains/crm/services/CrmWhatsapp/whatsappCampaignRead.js";
import {
  cancelWhatsappCampaign,
  pauseWhatsappCampaign,
  resumeWhatsappCampaign,
} from "../../../domains/crm/services/CrmWhatsapp/whatsappCampaignLifecycle.js";
import type { CrmServicePorts } from "../../../domains/crm/services/CrmService/serviceSupport.js";

type CrmContextService<Input, Output> = (
  context: ServiceContext,
  input: Input,
) => Promise<Output>;

export type CrmWhatsappCampaignServices = {
  cancelWhatsappCampaign: CrmContextService<
    WhatsappCampaignIdInput,
    CrmWhatsappCampaign
  >;
  createWhatsappCampaign: CrmContextService<
    CreateWhatsappCampaignInput,
    CrmWhatsappCampaign
  >;
  getWhatsappCampaignDetail: CrmContextService<
    WhatsappCampaignIdInput,
    WhatsappCampaignDetail
  >;
  listWhatsappCampaigns: CrmContextService<
    ListWhatsappCampaignsInput,
    readonly CrmWhatsappCampaign[]
  >;
  pauseWhatsappCampaign: CrmContextService<
    WhatsappCampaignIdInput,
    CrmWhatsappCampaign
  >;
  resumeWhatsappCampaign: CrmContextService<
    WhatsappCampaignIdInput,
    CrmWhatsappCampaign
  >;
};

export function createCrmWhatsappCampaignBindings(
  ports: CrmServicePorts,
): CrmWhatsappCampaignServices {
  return {
    cancelWhatsappCampaign: (context, input) =>
      cancelWhatsappCampaign(context, input, ports),
    createWhatsappCampaign: (context, input) =>
      createWhatsappCampaign(context, input, ports),
    getWhatsappCampaignDetail: (context, input) =>
      getWhatsappCampaignDetail(context, input, ports),
    listWhatsappCampaigns: (context, input) =>
      listWhatsappCampaigns(context, input, ports),
    pauseWhatsappCampaign: (context, input) =>
      pauseWhatsappCampaign(context, input, ports),
    resumeWhatsappCampaign: (context, input) =>
      resumeWhatsappCampaign(context, input, ports),
  };
}
