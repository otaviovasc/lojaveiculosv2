import { CampaignAutomationPanel } from "./CrmWhatsappCampaignAutomationPanel";
import {
  CampaignCsvPanel,
  CampaignMessagePanel,
  CampaignRecipientsPanel,
} from "./CrmWhatsappCampaignsPageParts";
import { CampaignReviewPanel } from "./CrmWhatsappCampaignReviewPanel";
import type { CrmWhatsappSession, CrmWhatsappTag } from "./crmWhatsappTypes";

export function CrmWhatsappCampaignBuilder({
  campaignName,
  canCreate,
  canLaunch,
  csvInput,
  effectiveSelectedIds,
  filteredSessions,
  initialTagId,
  intervalMinutes,
  isSaving,
  lastResult,
  localError,
  matchedCsvSessionCount,
  onCampaignNameChange,
  onCsvInputChange,
  onInitialTagChange,
  onIntervalMinutesChange,
  onLaunch,
  onQueryChange,
  onReplyTagChange,
  onSecondaryContentChange,
  onSecondaryDelayMinutesChange,
  onStartAtChange,
  onTagChange,
  onTextChange,
  onToggleSession,
  preview,
  query,
  replyTagId,
  secondaryContent,
  secondaryDelayMinutes,
  selectedCount,
  selectedTagId,
  startAt,
  tags,
  text,
}: {
  campaignName: string;
  canCreate: boolean;
  canLaunch: boolean;
  csvInput: string;
  effectiveSelectedIds: Set<string>;
  filteredSessions: CrmWhatsappSession[];
  initialTagId: string;
  intervalMinutes: number;
  isSaving: boolean;
  lastResult: string | null;
  localError: string | null;
  matchedCsvSessionCount: number;
  onCampaignNameChange: (value: string) => void;
  onCsvInputChange: (value: string) => void;
  onInitialTagChange: (value: string) => void;
  onIntervalMinutesChange: (value: number) => void;
  onLaunch: () => void;
  onQueryChange: (value: string) => void;
  onReplyTagChange: (value: string) => void;
  onSecondaryContentChange: (value: string) => void;
  onSecondaryDelayMinutesChange: (value: number) => void;
  onStartAtChange: (value: string) => void;
  onTagChange: (value: string) => void;
  onTextChange: (value: string) => void;
  onToggleSession: (sessionId: string) => void;
  preview: string;
  query: string;
  replyTagId: string;
  secondaryContent: string;
  secondaryDelayMinutes: number;
  selectedCount: number;
  selectedTagId: string;
  startAt: string;
  tags: CrmWhatsappTag[];
  text: string;
}) {
  return (
    <div className="crm-whatsapp-campaign-layout">
      <CampaignMessagePanel
        canCreate={canCreate}
        campaignName={campaignName}
        intervalMinutes={intervalMinutes}
        isSaving={isSaving}
        onCampaignNameChange={onCampaignNameChange}
        onIntervalMinutesChange={onIntervalMinutesChange}
        onStartAtChange={onStartAtChange}
        onTextChange={onTextChange}
        startAt={startAt}
        text={text}
      />
      <CampaignAutomationPanel
        initialTagId={initialTagId}
        onInitialTagChange={onInitialTagChange}
        onReplyTagChange={onReplyTagChange}
        onSecondaryContentChange={onSecondaryContentChange}
        onSecondaryDelayMinutesChange={onSecondaryDelayMinutesChange}
        replyTagId={replyTagId}
        secondaryContent={secondaryContent}
        secondaryDelayMinutes={secondaryDelayMinutes}
        tags={tags}
      />
      <CampaignRecipientsPanel
        effectiveSelectedIds={effectiveSelectedIds}
        filteredSessions={filteredSessions}
        onQueryChange={onQueryChange}
        onTagChange={onTagChange}
        onToggleSession={onToggleSession}
        query={query}
        selectedTagId={selectedTagId}
        tags={tags}
      />
      <CampaignCsvPanel
        csvInput={csvInput}
        matchedCount={matchedCsvSessionCount}
        onCsvInputChange={onCsvInputChange}
      />
      <CampaignReviewPanel
        canLaunch={canLaunch}
        intervalMinutes={intervalMinutes}
        isSaving={isSaving}
        lastResult={lastResult}
        localError={localError}
        onLaunch={onLaunch}
        preview={preview}
        selectedCount={selectedCount}
      />
    </div>
  );
}
