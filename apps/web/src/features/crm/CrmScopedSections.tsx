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
import type { CrmProviderConnection } from "./crmConversationTypes";
import type { CrmSpecialDateApi } from "./crmSpecialDateApi";
import {
  peekCrmScopedCache,
  CRM_CAMPAIGNS_CACHE_KEY,
  crmScheduledMessagesCacheKey,
  writeCrmScopedCache,
} from "./crmScopedCache";
import type { useCrmInbox } from "./useCrmInbox";
import { readCrmConnectionCapabilities } from "./crmProviderCapabilities";

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
  const campaignConnection = inbox.activeConnection;
  const campaignCapabilities =
    readCrmConnectionCapabilities(campaignConnection);
  return (
    <CrmCampaignsPage
      campaignConnectionKey={inbox.connectionId}
      canCancel={inbox.permissions.canCampaignManage}
      canCreate={inbox.permissions.canCampaignManage}
      canRead={inbox.permissions.canCampaignRead}
      canUseImage={campaignCapabilities.allowImages}
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
  canManageSpecialDates = false,
  connections = [],
  specialDateApi,
}: {
  api: CrmConversationApi;
  canManage: boolean;
  canRead: boolean;
  canRetry: boolean;
  canManageSpecialDates?: boolean;
  connections?: readonly CrmProviderConnection[];
  specialDateApi?: CrmSpecialDateApi;
}) {
  return (
    <CrmExternalBotPage
      api={api}
      canManage={canManage}
      canRead={canRead}
      canRetry={canRetry}
      canManageSpecialDates={canManageSpecialDates}
      connections={connections}
      {...(specialDateApi ? { specialDateApi } : {})}
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
      onUpdate={inbox.updateScheduledMessage}
      conversationCycles={inbox.conversationCycles}
    />
  );
}
