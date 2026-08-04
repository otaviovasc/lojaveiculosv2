import { useCallback } from "react";
import type { CrmWhatsappApi } from "./crmWhatsappApi";
import type { ProductCrmApi } from "./productCrmApi";
import { CrmWhatsappCampaignsPage } from "./CrmWhatsappCampaignsPage";
import { CrmWhatsappIntegrationsPage } from "./CrmWhatsappIntegrationsPage";
import { CrmWhatsappSchedulesPage } from "./CrmWhatsappSchedulesPage";
import type {
  CrmWhatsappListScheduledMessagesInput,
  CrmWhatsappScheduledMessage,
} from "./crmWhatsappTypes";
import type { CrmWhatsappCampaign } from "./crmWhatsappCampaignTypes";
import {
  peekWhatsappScopedCache,
  WHATSAPP_CAMPAIGNS_CACHE_KEY,
  whatsappScheduledMessagesCacheKey,
  writeWhatsappScopedCache,
} from "./crmWhatsappScopedCache";
import type { useCrmWhatsappInbox } from "./useCrmWhatsappInbox";

type InboxState = ReturnType<typeof useCrmWhatsappInbox>;

export function WhatsappCampaignsSection({
  api,
  inbox,
  leadApi,
}: {
  api: CrmWhatsappApi;
  inbox: InboxState;
  leadApi: ProductCrmApi;
}) {
  const listCampaigns = useCallback(async () => {
    const campaigns = await api.listCampaigns({ limit: 50 });
    writeWhatsappScopedCache(api, WHATSAPP_CAMPAIGNS_CACHE_KEY, campaigns);
    return campaigns;
  }, [api]);
  const initialCampaigns = peekWhatsappScopedCache<CrmWhatsappCampaign[]>(
    api,
    WHATSAPP_CAMPAIGNS_CACHE_KEY,
  );
  return (
    <CrmWhatsappCampaignsPage
      canCancel={inbox.permissions.canCampaignManage}
      canCreate={inbox.permissions.canCampaignManage}
      canRead={inbox.permissions.canCampaignRead}
      {...(initialCampaigns ? { initialCampaigns } : {})}
      onCancelCampaign={api.cancelCampaign}
      onCreateCampaign={api.createCampaign}
      onGetCampaign={api.getCampaign}
      onListCampaigns={listCampaigns}
      onListLeads={leadApi.listLeads}
      onListRecipientSessions={api.listSessions}
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

export function WhatsappSchedulesSection({
  api,
  inbox,
}: {
  api: CrmWhatsappApi;
  inbox: InboxState;
}) {
  const listScheduledMessages = useCallback(
    async (input: CrmWhatsappListScheduledMessagesInput = {}) => {
      const messages: CrmWhatsappScheduledMessage[] =
        await inbox.listScheduledMessages(input);
      writeWhatsappScopedCache(
        api,
        whatsappScheduledMessagesCacheKey(
          input.connectionId ?? inbox.connectionId,
        ),
        messages,
      );
      return messages;
    },
    [api, inbox],
  );
  const initialMessages = peekWhatsappScopedCache<
    CrmWhatsappScheduledMessage[]
  >(api, whatsappScheduledMessagesCacheKey(inbox.connectionId));
  return (
    <CrmWhatsappSchedulesPage
      activeSession={inbox.activeSession}
      canCancel={inbox.permissions.canScheduleCancel}
      canCreate={inbox.permissions.canScheduleCreate}
      canProcess={inbox.permissions.canScheduleProcess}
      canRead={inbox.permissions.canScheduleRead}
      connectionId={inbox.connectionId}
      error={inbox.scheduledMessagesError}
      {...(initialMessages ? { initialMessages } : {})}
      onCancel={inbox.cancelScheduledMessage}
      onList={listScheduledMessages}
      onProcessDue={inbox.processDueScheduledMessages}
      onSchedule={inbox.createScheduledMessage}
      sessions={inbox.sessions}
    />
  );
}
