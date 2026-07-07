import type { CrmWhatsappApi } from "./crmWhatsappApi";
import { CrmWhatsappCampaignsPage } from "./CrmWhatsappCampaignsPage";
import { CrmWhatsappIntegrationsPage } from "./CrmWhatsappIntegrationsPage";
import type { useCrmWhatsappInbox } from "./useCrmWhatsappInbox";

type InboxState = ReturnType<typeof useCrmWhatsappInbox>;

export function WhatsappCampaignsSection({ inbox }: { inbox: InboxState }) {
  return (
    <CrmWhatsappCampaignsPage
      canCancel={inbox.permissions.canScheduleCancel}
      canCreate={inbox.permissions.canScheduleCreate}
      canRead={inbox.permissions.canScheduleRead}
      connectionId={inbox.connectionId}
      onCancel={inbox.cancelScheduledMessage}
      onList={inbox.listScheduledMessages}
      onSchedule={inbox.createScheduledMessage}
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
