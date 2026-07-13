import { useState } from "react";
import { Megaphone } from "lucide-react";
import { CampaignAutomationPanel } from "./CrmWhatsappCampaignAutomationPanel";
import { CampaignCsvPanel } from "./CrmWhatsappCampaignCsvPanel";
import { CampaignSchedulePanel } from "./CrmWhatsappCampaignSchedulePanel";
import { CampaignMessagePanel } from "./CrmWhatsappCampaignsPageParts";
import { CampaignReviewPanel } from "./CrmWhatsappCampaignReviewPanel";
import { CampaignAudiencePanel } from "./CrmWhatsappCampaignAudiencePanel";
import {
  CrmWhatsappWorkflowFooter,
  CrmWhatsappWorkflowPanel,
  CrmWhatsappWorkflowStepper,
} from "./CrmWhatsappWorkflow";
import type {
  CampaignAudienceSource,
  CampaignLeadFilters,
} from "./crmWhatsappCampaignSources";
import type {
  CampaignRecipientReviewRow,
  CampaignRecipientReviewSummary,
} from "./CrmWhatsappCampaignRecipientReview";
import type { CrmWhatsappSession, CrmWhatsappTag } from "./crmWhatsappTypes";

export function CrmWhatsappCampaignBuilder({
  audienceSource,
  campaignName,
  canCreate,
  canLaunch,
  csvInput,
  effectiveSelectedIds,
  filteredSessions,
  initialTagId,
  intervalMinutes,
  isAudienceLoading,
  isSaving,
  lastResult,
  localError,
  matchedCsvSessionCount,
  matchedLeadCount,
  leadFilters,
  onAudienceSourceChange,
  onCancel,
  onCampaignNameChange,
  onCsvInputChange,
  onInitialTagChange,
  onIntervalMinutesChange,
  onLeadFiltersChange,
  onLaunch,
  onQueryChange,
  onReplyTagChange,
  onReviewNameChange,
  onReviewRowToggle,
  onSecondaryContentChange,
  onSecondaryDelayMinutesChange,
  onStartAtChange,
  onSelectVisible,
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
  withoutSessionCount,
}: {
  audienceSource: CampaignAudienceSource;
  campaignName: string;
  canCreate: boolean;
  canLaunch: boolean;
  csvInput: string;
  effectiveSelectedIds: Set<string>;
  filteredSessions: CrmWhatsappSession[];
  initialTagId: string;
  intervalMinutes: number;
  isAudienceLoading: boolean;
  isSaving: boolean;
  lastResult: string | null;
  localError: string | null;
  matchedCsvSessionCount: number;
  matchedLeadCount: number;
  leadFilters: CampaignLeadFilters;
  onAudienceSourceChange: (value: CampaignAudienceSource) => void;
  onCancel: () => void;
  onCampaignNameChange: (value: string) => void;
  onCsvInputChange: (value: string) => void;
  onInitialTagChange: (value: string) => void;
  onIntervalMinutesChange: (value: number) => void;
  onLeadFiltersChange: (value: CampaignLeadFilters) => void;
  onLaunch: () => void;
  onQueryChange: (value: string) => void;
  onReplyTagChange: (value: string) => void;
  onReviewNameChange: (rowId: string, value: string) => void;
  onReviewRowToggle: (rowId: string) => void;
  onSecondaryContentChange: (value: string) => void;
  onSecondaryDelayMinutesChange: (value: number) => void;
  onStartAtChange: (value: string) => void;
  onSelectVisible: () => void;
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
  withoutSessionCount: number;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const canContinue = [
    Boolean(campaignName.trim() && text.trim()),
    reviewRows.length > 0,
    Boolean(selectedCount && !reviewSummary.blockedIncluded),
    canLaunch,
  ][currentStep];
  const activeStep =
    campaignWorkflowSteps[currentStep] ?? campaignWorkflowSteps[0];

  return (
    <div className="crm-whatsapp-workflow crm-whatsapp-campaign-workflow">
      <CrmWhatsappWorkflowStepper
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        steps={campaignWorkflowSteps}
      />
      <CrmWhatsappWorkflowPanel
        description={activeStep.description}
        title={activeStep.label}
      >
        {currentStep === 0 ? (
          <div className="crm-whatsapp-campaign-step-grid">
            <CampaignMessagePanel
              canCreate={canCreate}
              campaignName={campaignName}
              isSaving={isSaving}
              onCampaignNameChange={onCampaignNameChange}
              onTextChange={onTextChange}
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
          </div>
        ) : null}
        {currentStep === 1 ? (
          <div className="crm-whatsapp-campaign-step-grid">
            <CampaignAudiencePanel
              audienceSource={audienceSource}
              effectiveSelectedIds={effectiveSelectedIds}
              filteredSessions={filteredSessions}
              isLoading={isAudienceLoading}
              leadFilters={leadFilters}
              matchedLeadCount={matchedLeadCount}
              onAudienceSourceChange={onAudienceSourceChange}
              onLeadFiltersChange={onLeadFiltersChange}
              onQueryChange={onQueryChange}
              onSelectVisible={onSelectVisible}
              onTagChange={onTagChange}
              onToggleSession={onToggleSession}
              query={query}
              selectedTagId={selectedTagId}
              tags={tags}
              withoutSessionCount={withoutSessionCount}
            />
            <CampaignCsvPanel
              csvInput={csvInput}
              matchedCount={matchedCsvSessionCount}
              onCsvInputChange={onCsvInputChange}
            />
          </div>
        ) : null}
        {currentStep === 2 ? (
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
            showLaunchAction={false}
            summary={reviewSummary}
          />
        ) : null}
        {currentStep === 3 ? (
          <CampaignSchedulePanel
            campaignName={campaignName}
            intervalMinutes={intervalMinutes}
            localError={localError}
            onIntervalMinutesChange={onIntervalMinutesChange}
            onStartAtChange={onStartAtChange}
            preview={preview}
            selectedCount={selectedCount}
            startAt={startAt}
          />
        ) : null}
      </CrmWhatsappWorkflowPanel>
      <CrmWhatsappWorkflowFooter
        backDisabled={currentStep === 0}
        confirmIcon={<Megaphone aria-hidden="true" />}
        confirmLabel="Agendar campanha"
        isBusy={isSaving}
        isLastStep={currentStep === campaignWorkflowSteps.length - 1}
        nextDisabled={!canContinue}
        onBack={() => setCurrentStep((step) => Math.max(0, step - 1))}
        onCancel={onCancel}
        onNext={() => {
          if (currentStep === campaignWorkflowSteps.length - 1) onLaunch();
          else setCurrentStep((step) => step + 1);
        }}
      />
    </div>
  );
}

const campaignWorkflowSteps = [
  { label: "Mensagem", description: "Conteudo e automacao" },
  { label: "Publico", description: "Conversas, leads ou CSV" },
  { label: "Revisao", description: "Validacao dos destinatarios" },
  { label: "Programacao", description: "Horario e confirmacao" },
] as const;
