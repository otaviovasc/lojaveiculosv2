import { CrmCampaignDetailPanel } from "./CrmCampaignDetailPanel";
import { CrmCampaignList } from "./CrmCampaignList";
import { mutateCampaign } from "./CrmCampaignsPageSupport";
import type { CrmCampaign, CrmCampaignDetail } from "./crmCampaignTypes";
import type { CrmConversationCycle, CrmTag } from "./crmConversationTypes";

export function CrmCampaignOverview({
  campaignDetail,
  campaignError,
  campaigns,
  canManage,
  isLoading,
  isLoadingDetail,
  onCancelCampaign,
  onPauseCampaign,
  onReload,
  onMutationError,
  onRetryCampaigns,
  onResumeCampaign,
  onSelectCampaign,
  selectedCampaignId,
  conversationCycles,
  tags,
}: {
  campaignDetail: CrmCampaignDetail | null;
  campaignError?: string | null;
  campaigns: CrmCampaign[];
  canManage: boolean;
  isLoading: boolean;
  isLoadingDetail: boolean;
  onCancelCampaign: (campaignId: string) => Promise<CrmCampaign | null>;
  onPauseCampaign: (campaignId: string) => Promise<CrmCampaign | null>;
  onReload: () => Promise<void>;
  onMutationError?: (error: unknown) => void;
  onRetryCampaigns?: () => Promise<void>;
  onResumeCampaign: (campaignId: string) => Promise<CrmCampaign | null>;
  onSelectCampaign: (campaignId: string) => void;
  selectedCampaignId: string | null;
  conversationCycles: CrmConversationCycle[];
  tags: CrmTag[];
}) {
  return (
    <div className="crm-campaign-overview">
      <CrmCampaignList
        campaigns={campaigns}
        canManage={canManage}
        isLoading={isLoading}
        {...(campaignError !== undefined ? { error: campaignError } : {})}
        onCancel={(id) =>
          mutateCampaign(onCancelCampaign, id, onReload, onMutationError)
        }
        onPause={(id) =>
          mutateCampaign(onPauseCampaign, id, onReload, onMutationError)
        }
        onResume={(id) =>
          mutateCampaign(onResumeCampaign, id, onReload, onMutationError)
        }
        onSelect={onSelectCampaign}
        {...(onRetryCampaigns ? { onRetry: onRetryCampaigns } : {})}
        selectedCampaignId={selectedCampaignId}
      />
      <CrmCampaignDetailPanel
        detail={campaignDetail}
        isLoading={isLoadingDetail}
        conversationCycles={conversationCycles}
        tags={tags}
      />
    </div>
  );
}
