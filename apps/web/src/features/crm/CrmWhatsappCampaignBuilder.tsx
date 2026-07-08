import { CampaignAutomationPanel } from "./CrmWhatsappCampaignAutomationPanel";
import { CampaignCsvPanel } from "./CrmWhatsappCampaignCsvPanel";
import {
  CampaignMessagePanel,
  CampaignRecipientsPanel,
} from "./CrmWhatsappCampaignsPageParts";
import { CampaignReviewPanel } from "./CrmWhatsappCampaignReviewPanel";
import type {
  CampaignRecipientReviewRow,
  CampaignRecipientReviewSummary,
} from "./CrmWhatsappCampaignRecipientReview";
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
  onReviewNameChange,
  onReviewRowToggle,
  onSecondaryContentChange,
  onSecondaryDelayMinutesChange,
  onStartAtChange,
  onTagChange,
  onTextChange,
  onToggleSession,
  preview,
  query,
  replyTagId,
  reviewRows,
  reviewSummary,
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
  onReviewNameChange: (rowId: string, value: string) => void;
  onReviewRowToggle: (rowId: string) => void;
  onSecondaryContentChange: (value: string) => void;
  onSecondaryDelayMinutesChange: (value: number) => void;
  onStartAtChange: (value: string) => void;
  onTagChange: (value: string) => void;
  onTextChange: (value: string) => void;
  onToggleSession: (sessionId: string) => void;
  preview: string;
  query: string;
  replyTagId: string;
  reviewRows: CampaignRecipientReviewRow[];
  reviewSummary: CampaignRecipientReviewSummary;
  secondaryContent: string;
  secondaryDelayMinutes: number;
  selectedCount: number;
  selectedTagId: string;
  startAt: string;
  tags: CrmWhatsappTag[];
  text: string;
}) {
  const setupSteps = [
    {
      done: Boolean(campaignName.trim() && text.trim() && startAt),
      label: "Mensagem",
      value: startAt ? "inicio definido" : "aguardando inicio",
    },
    {
      done: selectedCount > 0,
      label: "Destinatarios",
      value: `${selectedCount} valido(s)`,
    },
    {
      done: canLaunch,
      label: "Revisao",
      value: canLaunch ? "pronta" : "pendente",
    },
  ];

  return (
    <div className="crm-whatsapp-campaign-layout">
      <section className="crm-whatsapp-campaign-panel crm-whatsapp-campaign-builder-steps">
        {setupSteps.map((step, index) => (
          <div
            className={step.done ? "crm-whatsapp-campaign-step-done" : ""}
            key={step.label}
          >
            <span>{index + 1}</span>
            <strong>{step.label}</strong>
            <small>{step.value}</small>
          </div>
        ))}
      </section>
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
        onNameChange={onReviewNameChange}
        onToggleRow={onReviewRowToggle}
        preview={preview}
        rows={reviewRows}
        selectedCount={selectedCount}
        summary={reviewSummary}
      />
    </div>
  );
}
