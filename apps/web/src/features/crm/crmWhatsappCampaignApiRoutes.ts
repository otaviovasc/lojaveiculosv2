import { createCrmEndpoint } from "./apiClient";
import type { CrmWhatsappListCampaignsInput } from "./crmWhatsappCampaignTypes";

export const crmWhatsappCampaignRoutes = {
  campaignAction: (
    campaignId: string,
    action: "cancel" | "pause" | "resume",
    baseUrl?: string,
  ) =>
    createCrmEndpoint(
      `/crm/whatsapp/campaigns/${encodeURIComponent(campaignId)}/${action}`,
      baseUrl,
    ),
  campaignDetail: (campaignId: string, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/whatsapp/campaigns/${encodeURIComponent(campaignId)}`,
      baseUrl,
    ),
  campaigns: (baseUrl?: string) =>
    createCrmEndpoint("/crm/whatsapp/campaigns", baseUrl),
};

export function createCrmWhatsappCampaignsQuery(
  input: CrmWhatsappListCampaignsInput = {},
) {
  const params = new URLSearchParams();
  addOptionalParam(params, "limit", input.limit);
  addOptionalParam(params, "status", input.status);
  return params;
}

function addOptionalParam(
  params: URLSearchParams,
  key: string,
  value: number | string | undefined,
) {
  if (value !== undefined && value !== "") params.set(key, String(value));
}
