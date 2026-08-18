import { useCallback } from "react";
import type { CrmConversationApi } from "./crmConversationApi";
import type { ProductCrmApi } from "./productCrmApi";
import { CrmCampaignsPage } from "./CrmCampaignsPage";
import { CrmExternalBotPage } from "./CrmExternalBotPage";
import { CrmSchedulesPage } from "./CrmSchedulesPage";
import type {
  CrmListScheduledMessagesInput,
  CrmScheduledMessage,
} from "./crmConversationTypes";
import type { CrmCampaign } from "./crmCampaignTypes";
import {
  peekCrmScopedCache,
  CRM_CAMPAIGNS_CACHE_KEY,
  crmScheduledMessagesCacheKey,
  writeCrmScopedCache,
} from "./crmScopedCache";
import type { useCrmInbox } from "./useCrmInbox";

type InboxState = ReturnType<typeof useCrmInbox>;

export function CrmCampaignsSection({
  api,
  inbox,
  leadApi,
}: {
  api: CrmConversationApi;
  inbox: InboxState;
  leadApi: ProductCrmApi;
}) {
  const listCampaigns = useCallback(async () => {
    const campaigns = await api.listCampaigns({ limit: 50 });
    writeCrmScopedCache(api, CRM_CAMPAIGNS_CACHE_KEY, campaigns);
    return campaigns;
  }, [api]);
  const initialCampaigns = peekCrmScopedCache<CrmCampaign[]>(
    api,
    CRM_CAMPAIGNS_CACHE_KEY,
  );
  return (
    <CrmCampaignsPage
      canCancel={inbox.permissions.canCampaignManage}
      canCreate={inbox.permissions.canCampaignManage}
      canRead={inbox.permissions.canCampaignRead}
      {...(initialCampaigns ? { initialCampaigns } : {})}
      onCancelCampaign={api.cancelCampaign}
      onCreateCampaign={api.createCampaign}
      onGetCampaign={api.getCampaign}
      onListCampaigns={listCampaigns}
      onListLeads={leadApi.listLeads}
      onListRecipientSessions={api.listConversationCycles}
      onPauseCampaign={api.pauseCampaign}
      onResumeCampaign={api.resumeCampaign}
      conversationCycles={inbox.conversationCycles}
      tags={inbox.availableTags}
    />
  );
}

export function CrmIntegrationsSection({
  api,
  canManage,
  canRead,
  canRetry,
}: {
  api: CrmConversationApi;
  canManage: boolean;
  canRead: boolean;
  canRetry: boolean;
}) {
  return (
    <CrmExternalBotPage
      api={api}
      canManage={canManage}
      canRead={canRead}
      canRetry={canRetry}
    />
  );
}

export function CrmSchedulesSection({
  api,
  inbox,
}: {
  api: CrmConversationApi;
  inbox: InboxState;
}) {
  const listScheduledMessages = useCallback(
    async (input: CrmListScheduledMessagesInput = {}) => {
      const messages: CrmScheduledMessage[] =
        await inbox.listScheduledMessages(input);
      writeCrmScopedCache(
        api,
        crmScheduledMessagesCacheKey(input.connectionId ?? inbox.connectionId),
        messages,
      );
      return messages;
    },
    [api, inbox],
  );
  const initialMessages = peekCrmScopedCache<CrmScheduledMessage[]>(
    api,
    crmScheduledMessagesCacheKey(inbox.connectionId),
  );
  return (
    <CrmSchedulesPage
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
      conversationCycles={inbox.conversationCycles}
    />
  );
}
