import { useCallback, useEffect, useState } from "react";
import { CrmWhatsappCampaignBuilder } from "./CrmWhatsappCampaignBuilder";
import { CampaignModeBar } from "./CrmWhatsappCampaignModeBar";
import { CrmWhatsappCampaignOverview } from "./CrmWhatsappCampaignOverview";
import { CampaignStats } from "./CrmWhatsappCampaignsPageParts";
import {
  buildCampaignInput,
  type CrmWhatsappCampaignsPageProps,
} from "./CrmWhatsappCampaignsPageSupport";
import { useCrmWhatsappCampaignAudience } from "./useCrmWhatsappCampaignAudience";
import { useCrmWhatsappCampaignReview } from "./useCrmWhatsappCampaignReview";
import type {
  CrmWhatsappCampaign,
  CrmWhatsappCampaignDetail,
} from "./crmWhatsappCampaignTypes";

export function CrmWhatsappCampaignsPage({
  canCancel,
  canCreate,
  canRead,
  onCancelCampaign,
  onCreateCampaign,
  onGetCampaign,
  onListCampaigns,
  onListLeads,
  onListRecipientSessions,
  onPauseCampaign,
  onResumeCampaign,
  sessions,
  tags,
}: CrmWhatsappCampaignsPageProps) {
  const [csvInput, setCsvInput] = useState("");
  const [campaigns, setCampaigns] = useState<CrmWhatsappCampaign[]>([]);
  const [mode, setMode] = useState<"create" | "overview">("overview");
  const [campaignDetail, setCampaignDetail] =
    useState<CrmWhatsappCampaignDetail | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    null,
  );
  const [campaignName, setCampaignName] = useState("Nova campanha");
  const [startAt, setStartAt] = useState("");
  const [intervalMinutes, setIntervalMinutes] = useState(2);
  const [initialTagId, setInitialTagId] = useState("none");
  const [replyTagId, setReplyTagId] = useState("none");
  const [secondaryContent, setSecondaryContent] = useState("");
  const [secondaryDelayMinutes, setSecondaryDelayMinutes] = useState(60);
  const [text, setText] = useState("Ola {nome}, tudo bem?");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const audience = useCrmWhatsappCampaignAudience({
    canRead,
    initialSessions: sessions,
    ...(onListLeads ? { onListLeads } : {}),
    ...(onListRecipientSessions
      ? { onListSessions: onListRecipientSessions }
      : {}),
  });
  const review = useCrmWhatsappCampaignReview({
    campaignName,
    canCreate,
    csvInput,
    filteredSessions: audience.filteredSessions,
    isSaving,
    sessions: audience.sessions,
    startAt,
    text,
  });

  const loadCampaigns = useCallback(async () => {
    if (!canRead) return;
    setIsLoading(true);
    try {
      const nextCampaigns = await onListCampaigns();
      setCampaigns(nextCampaigns);
      setSelectedCampaignId(
        (current) => current ?? nextCampaigns[0]?.id ?? null,
      );
    } finally {
      setIsLoading(false);
    }
  }, [canRead, onListCampaigns]);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  const loadCampaignDetail = useCallback(async () => {
    if (!canRead || !selectedCampaignId) {
      setCampaignDetail(null);
      return;
    }
    setIsLoadingDetail(true);
    try {
      setCampaignDetail(await onGetCampaign(selectedCampaignId));
    } finally {
      setIsLoadingDetail(false);
    }
  }, [canRead, onGetCampaign, selectedCampaignId]);

  useEffect(() => {
    void loadCampaignDetail();
  }, [loadCampaignDetail]);

  const reloadCampaignViews = useCallback(async () => {
    await loadCampaigns();
    await loadCampaignDetail();
  }, [loadCampaignDetail, loadCampaigns]);

  const launch = async () => {
    if (!review.canLaunch) return;
    const firstDate = new Date(startAt);
    if (Number.isNaN(firstDate.getTime()) || firstDate <= new Date()) {
      setLocalError("Escolha uma data futura para iniciar a campanha.");
      return;
    }
    setIsSaving(true);
    setLocalError(null);
    setLastResult(null);
    const campaign = await onCreateCampaign(
      buildCampaignInput({
        campaignName,
        firstDate,
        initialTagId,
        intervalMinutes,
        replyTagId,
        secondaryContent,
        secondaryDelayMinutes,
        text,
        validRecipients: review.validRecipients,
      }),
    );
    setIsSaving(false);
    if (campaign) {
      setLastResult(`${campaign.totalRecipients} destinatario(s) agendado(s).`);
      setCampaignName("Nova campanha");
      setCsvInput("");
      setInitialTagId("none");
      setIntervalMinutes(2);
      setReplyTagId("none");
      review.resetReview();
      setSecondaryContent("");
      setSecondaryDelayMinutes(60);
      setSelectedCampaignId(campaign.id);
      setStartAt("");
      setText("Ola {nome}, tudo bem?");
      await loadCampaigns();
      setMode("overview");
    }
  };

  return (
    <section className="crm-whatsapp-section">
      <div className="crm-whatsapp-campaigns-page">
        <CampaignModeBar
          campaignCount={campaigns.length}
          canCreate={canCreate}
          lastResult={lastResult}
          mode={mode}
          onCreate={() => {
            setLastResult(null);
            setLocalError(null);
            setMode("create");
          }}
        />
        {mode === "overview" ? (
          <>
            <CampaignStats campaigns={campaigns} />
            <CrmWhatsappCampaignOverview
              campaignDetail={campaignDetail}
              campaigns={campaigns}
              canManage={canCancel}
              isLoading={isLoading}
              isLoadingDetail={isLoadingDetail}
              onCancelCampaign={onCancelCampaign}
              onPauseCampaign={onPauseCampaign}
              onReload={reloadCampaignViews}
              onResumeCampaign={onResumeCampaign}
              onSelectCampaign={setSelectedCampaignId}
              selectedCampaignId={selectedCampaignId}
              sessions={audience.sessions}
              tags={tags}
            />
          </>
        ) : (
          <CrmWhatsappCampaignBuilder
            audienceSource={audience.audienceSource}
            campaignName={campaignName}
            canCreate={canCreate}
            canLaunch={review.canLaunch}
            csvInput={csvInput}
            effectiveSelectedIds={review.effectiveSelectedIds}
            filteredSessions={audience.filteredSessions}
            initialTagId={initialTagId}
            intervalMinutes={intervalMinutes}
            isAudienceLoading={audience.isLoading}
            isSaving={isSaving}
            lastResult={lastResult}
            leadFilters={audience.leadFilters}
            localError={localError ?? audience.error}
            matchedCsvSessionCount={review.matchedCsvSessionCount}
            matchedLeadCount={audience.matchedLeadCount}
            onAudienceSourceChange={audience.setAudienceSource}
            onCancel={() => setMode("overview")}
            onCampaignNameChange={setCampaignName}
            onCsvInputChange={setCsvInput}
            onInitialTagChange={setInitialTagId}
            onIntervalMinutesChange={setIntervalMinutes}
            onLeadFiltersChange={audience.setLeadFilters}
            onLaunch={() => void launch()}
            onQueryChange={audience.setQuery}
            onReplyTagChange={setReplyTagId}
            onReviewNameChange={review.updateReviewRowName}
            onReviewRowToggle={review.toggleReviewRow}
            onSecondaryContentChange={setSecondaryContent}
            onSecondaryDelayMinutesChange={setSecondaryDelayMinutes}
            onSelectVisible={review.selectVisibleSessions}
            onStartAtChange={setStartAt}
            onTagChange={audience.setSelectedTagId}
            onTextChange={setText}
            onToggleSession={review.toggleSession}
            preview={review.preview}
            query={audience.query}
            replyTagId={replyTagId}
            reviewRows={review.reviewRows}
            reviewSummary={review.reviewSummary}
            secondaryContent={secondaryContent}
            secondaryDelayMinutes={secondaryDelayMinutes}
            selectedCount={review.validRecipients.length}
            selectedTagId={audience.selectedTagId}
            startAt={startAt}
            tags={tags}
            text={text}
            withoutSessionCount={audience.withoutSessionCount}
          />
        )}
      </div>
    </section>
  );
}
