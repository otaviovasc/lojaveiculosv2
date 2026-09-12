import { createCrmEndpoint } from "./apiClient";
import type { CrmListCampaignsInput } from "./crmCampaignTypes";

export const crmCampaignRoutes = {
  campaignAction: (
    campaignId: string,
    action: "cancel" | "pause" | "resume",
    baseUrl?: string,
  ) =>
    createCrmEndpoint(
      `/crm/campaigns/${encodeURIComponent(campaignId)}/${action}`,
      baseUrl,
    ),
  campaignDetail: (campaignId: string, baseUrl?: string) =>
    createCrmEndpoint(
      `/crm/campaigns/${encodeURIComponent(campaignId)}`,
      baseUrl,
    ),
  campaigns: (baseUrl?: string) => createCrmEndpoint("/crm/campaigns", baseUrl),
};

export function createCrmCampaignsQuery(input: CrmListCampaignsInput = {}) {
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
