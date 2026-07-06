import type { CrmWhatsappApi } from "./crmWhatsappApi";
import { CrmWhatsappIntegrationsPage } from "./CrmWhatsappIntegrationsPage";
import { CrmWhatsappSchedulesPage } from "./CrmWhatsappSchedulesPage";
import type { useCrmWhatsappInbox } from "./useCrmWhatsappInbox";

type InboxState = ReturnType<typeof useCrmWhatsappInbox>;

export function WhatsappCampaignsSection({ inbox }: { inbox: InboxState }) {
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
