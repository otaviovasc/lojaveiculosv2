import { useState } from "react";
import { Megaphone } from "lucide-react";
import { CampaignAutomationPanel } from "./CrmCampaignAutomationPanel";
import { CampaignCsvPanel } from "./CrmCampaignCsvPanel";
import { CampaignSchedulePanel } from "./CrmCampaignSchedulePanel";
import { CampaignMessagePanel } from "./CrmCampaignsPageParts";
import { CampaignReviewPanel } from "./CrmCampaignReviewPanel";
import { CampaignAudiencePanel } from "./CrmCampaignAudiencePanel";
import {
  CrmWorkflowFooter,
  CrmWorkflowPanel,
  CrmWorkflowStepper,
} from "./CrmWorkflow";
import type {
  CampaignAudienceSource,
  CampaignLeadFilters,
} from "./crmCampaignSources";
import type {
  CampaignRecipientReviewRow,
  CampaignRecipientReviewSummary,
} from "./CrmCampaignRecipientReview";
import type { CrmCampaignStageOption } from "./CrmCampaignsPageSupport";
import type { CrmConversationCycle } from "./crmConversationTypes";

export function CrmCampaignBuilder({
  audienceSource,
  campaignName,
  canCreate,
  canLaunch,
  csvInput,
  effectiveSelectedIds,
  filteredSessions,
  initialStageId,
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
  onInitialStageChange,
  onIntervalMinutesChange,
  onLeadFiltersChange,
  onLaunch,
  onQueryChange,
  onReplyStageChange,
  onReviewNameChange,
  onReviewRowToggle,
  onSecondaryContentChange,
  onSecondaryDelayMinutesChange,
  onStartAtChange,
  onSelectVisible,
  onTextChange,
  onToggleSession,
  preview,
  query,
  replyStageId,
  reviewRows,
  reviewSummary,
  secondaryContent,
  secondaryDelayMinutes,
  selectedCount,
  stageOptions,
  startAt,
  text,
  withoutSessionCount,
}: {
  audienceSource: CampaignAudienceSource;
  campaignName: string;
  canCreate: boolean;
  canLaunch: boolean;
  csvInput: string;
  effectiveSelectedIds: Set<string>;
  filteredSessions: CrmConversationCycle[];
  initialStageId: string;
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
  onInitialStageChange: (value: string) => void;
  onIntervalMinutesChange: (value: number) => void;
  onLeadFiltersChange: (value: CampaignLeadFilters) => void;
  onLaunch: () => void;
  onQueryChange: (value: string) => void;
  onReplyStageChange: (value: string) => void;
  onReviewNameChange: (rowId: string, value: string) => void;
  onReviewRowToggle: (rowId: string) => void;
  onSecondaryContentChange: (value: string) => void;
  onSecondaryDelayMinutesChange: (value: number) => void;
  onStartAtChange: (value: string) => void;
  onSelectVisible: () => void;
  onTextChange: (value: string) => void;
  onToggleSession: (cycleId: string) => void;
  preview: string;
  query: string;
  replyStageId: string;
  reviewRows: CampaignRecipientReviewRow[];
  reviewSummary: CampaignRecipientReviewSummary;
  secondaryContent: string;
  secondaryDelayMinutes: number;
  selectedCount: number;
  stageOptions: CrmCampaignStageOption[];
  startAt: string;
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
    <div className="crm-workflow crm-campaign-workflow">
      <CrmWorkflowStepper
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        steps={campaignWorkflowSteps}
      />
      <CrmWorkflowPanel
        description={activeStep.description}
        title={activeStep.label}
      >
        {currentStep === 0 ? (
          <div className="crm-campaign-step-grid">
            <CampaignMessagePanel
              canCreate={canCreate}
              campaignName={campaignName}
              isSaving={isSaving}
              onCampaignNameChange={onCampaignNameChange}
              onTextChange={onTextChange}
              text={text}
            />
            <CampaignAutomationPanel
              initialStageId={initialStageId}
              onInitialStageChange={onInitialStageChange}
              onReplyStageChange={onReplyStageChange}
              onSecondaryContentChange={onSecondaryContentChange}
              onSecondaryDelayMinutesChange={onSecondaryDelayMinutesChange}
              replyStageId={replyStageId}
              secondaryContent={secondaryContent}
              secondaryDelayMinutes={secondaryDelayMinutes}
              stageOptions={stageOptions}
            />
          </div>
        ) : null}
        {currentStep === 1 ? (
          <div className="crm-campaign-step-grid">
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
              onToggleSession={onToggleSession}
              query={query}
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
      </CrmWorkflowPanel>
      <CrmWorkflowFooter
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
