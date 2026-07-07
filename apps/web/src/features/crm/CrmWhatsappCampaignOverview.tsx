import { CrmWhatsappCampaignDetailPanel } from "./CrmWhatsappCampaignDetailPanel";
import { CrmWhatsappCampaignList } from "./CrmWhatsappCampaignList";
import { mutateCampaign } from "./CrmWhatsappCampaignsPageSupport";
import type {
  CrmWhatsappCampaign,
  CrmWhatsappCampaignDetail,
} from "./crmWhatsappCampaignTypes";
import type { CrmWhatsappSession, CrmWhatsappTag } from "./crmWhatsappTypes";

export function CrmWhatsappCampaignOverview({
  campaignDetail,
  campaigns,
  canManage,
  isLoading,
  isLoadingDetail,
  onCancelCampaign,
  onPauseCampaign,
  onReload,
  onResumeCampaign,
  onSelectCampaign,
  selectedCampaignId,
  sessions,
  tags,
}: {
  campaignDetail: CrmWhatsappCampaignDetail | null;
  campaigns: CrmWhatsappCampaign[];
  canManage: boolean;
  isLoading: boolean;
  isLoadingDetail: boolean;
  onCancelCampaign: (campaignId: string) => Promise<CrmWhatsappCampaign | null>;
  onPauseCampaign: (campaignId: string) => Promise<CrmWhatsappCampaign | null>;
  onReload: () => Promise<void>;
  onResumeCampaign: (campaignId: string) => Promise<CrmWhatsappCampaign | null>;
  onSelectCampaign: (campaignId: string) => void;
  selectedCampaignId: string | null;
  sessions: CrmWhatsappSession[];
  tags: CrmWhatsappTag[];
}) {
  return (
    <div className="crm-whatsapp-campaign-overview">
      <CrmWhatsappCampaignList
        campaigns={campaigns}
        canManage={canManage}
        isLoading={isLoading}
        onCancel={(id) => mutateCampaign(onCancelCampaign, id, onReload)}
        onPause={(id) => mutateCampaign(onPauseCampaign, id, onReload)}
        onResume={(id) => mutateCampaign(onResumeCampaign, id, onReload)}
        onSelect={onSelectCampaign}
        selectedCampaignId={selectedCampaignId}
      />
      <CrmWhatsappCampaignDetailPanel
        detail={campaignDetail}
        isLoading={isLoadingDetail}
        sessions={sessions}
        tags={tags}
      />
    </div>
  );
}
