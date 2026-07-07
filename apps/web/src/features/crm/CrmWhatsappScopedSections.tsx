import type { CrmWhatsappApi } from "./crmWhatsappApi";
import { CrmWhatsappCampaignsPage } from "./CrmWhatsappCampaignsPage";
import { CrmWhatsappIntegrationsPage } from "./CrmWhatsappIntegrationsPage";
import { CrmWhatsappSchedulesPage } from "./CrmWhatsappSchedulesPage";
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

export function WhatsappSchedulesSection({ inbox }: { inbox: InboxState }) {
  return (
    <CrmWhatsappSchedulesPage
      activeSession={inbox.activeSession}
      canCancel={inbox.permissions.canScheduleCancel}
      canCreate={inbox.permissions.canScheduleCreate}
      canProcess={inbox.permissions.canScheduleProcess}
      canRead={inbox.permissions.canScheduleRead}
      connectionId={inbox.connectionId}
      error={inbox.scheduledMessagesError}
      onCancel={inbox.cancelScheduledMessage}
      onList={inbox.listScheduledMessages}
      onProcessDue={inbox.processDueScheduledMessages}
      onSchedule={inbox.createScheduledMessage}
      sessions={inbox.sessions}
    />
  );
}
