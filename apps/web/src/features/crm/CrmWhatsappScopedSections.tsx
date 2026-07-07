import type { CrmWhatsappApi } from "./crmWhatsappApi";
import { CrmWhatsappCampaignsPage } from "./CrmWhatsappCampaignsPage";
import { CrmWhatsappIntegrationsPage } from "./CrmWhatsappIntegrationsPage";
import type { useCrmWhatsappInbox } from "./useCrmWhatsappInbox";

type InboxState = ReturnType<typeof useCrmWhatsappInbox>;

export function WhatsappCampaignsSection({
  api,
  inbox,
}: {
  api: CrmWhatsappApi;
  inbox: InboxState;
}) {
  return (
    <CrmWhatsappCampaignsPage
      canCancel={inbox.permissions.canCampaignManage}
      canCreate={inbox.permissions.canCampaignManage}
      canRead={inbox.permissions.canCampaignRead}
      onCancelCampaign={api.cancelCampaign}
      onCreateCampaign={api.createCampaign}
      onGetCampaign={api.getCampaign}
      onListCampaigns={() => api.listCampaigns({ limit: 50 })}
      onPauseCampaign={api.pauseCampaign}
      onResumeCampaign={api.resumeCampaign}
      sessions={inbox.sessions}
      tags={inbox.availableTags}
    />
  );
}

export function WhatsappIntegrationsSection({
  api,
  canManage,
  canRead,
  canRetry,
}: {
  api: CrmWhatsappApi;
  canManage: boolean;
  canRead: boolean;
  canRetry: boolean;
}) {
  return (
    <CrmWhatsappIntegrationsPage
      api={api}
      canManage={canManage}
      canRead={canRead}
      canRetry={canRetry}
    />
  );
}
