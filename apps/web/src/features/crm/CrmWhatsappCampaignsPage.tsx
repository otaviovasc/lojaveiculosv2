import { useCallback, useEffect, useMemo, useState } from "react";
import { CrmWhatsappCampaignBuilder } from "./CrmWhatsappCampaignBuilder";
import { CrmWhatsappCampaignOverview } from "./CrmWhatsappCampaignOverview";
import { CampaignHeader, CampaignStats } from "./CrmWhatsappCampaignsPageParts";
import {
  matchCampaignCsvRows,
  parseCampaignCsv,
  renderCampaignMessage,
} from "./CrmWhatsappCampaignsPageUtils";
import {
  buildCampaignInput,
  matchesCampaignFilters,
  type CrmWhatsappCampaignsPageProps,
} from "./CrmWhatsappCampaignsPageSupport";
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
  onPauseCampaign,
  onResumeCampaign,
  sessions,
  tags,
}: CrmWhatsappCampaignsPageProps) {
  const [csvInput, setCsvInput] = useState("");
  const [campaigns, setCampaigns] = useState<CrmWhatsappCampaign[]>([]);
  const [campaignDetail, setCampaignDetail] =
    useState<CrmWhatsappCampaignDetail | null>(null);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    null,
  );
  const [selectedTagId, setSelectedTagId] = useState("all");
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

  const csvRows = useMemo(() => parseCampaignCsv(csvInput), [csvInput]);
  const matchedCsvSessionIds = useMemo(
    () =>
      new Set(
        matchCampaignCsvRows(csvRows, sessions).map((item) => String(item.id)),
      ),
    [csvRows, sessions],
  );
  const effectiveSelectedIds = useMemo(() => {
    const next = new Set(selectedIds);
    for (const id of matchedCsvSessionIds) next.add(id);
    return next;
  }, [matchedCsvSessionIds, selectedIds]);
  const selectedSessions = sessions.filter((session) =>
    effectiveSelectedIds.has(String(session.id)),
  );
  const filteredSessions = sessions.filter((session) =>
    matchesCampaignFilters(session, query, selectedTagId),
  );
  const canLaunch = Boolean(
    canCreate &&
    campaignName.trim() &&
    selectedSessions.length &&
    startAt &&
    text.trim() &&
    !isSaving,
  );

  const toggleSession = (sessionId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  };

  const launch = async () => {
    if (!canLaunch) return;
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
        selectedSessions,
        text,
      }),
    );
    setIsSaving(false);
    if (campaign) {
      setLastResult(`${campaign.totalRecipients} destinatario(s) agendado(s).`);
      setSelectedIds(new Set());
      setSelectedCampaignId(campaign.id);
      await loadCampaigns();
    }
  };

  return (
    <section className="crm-whatsapp-section">
      <div className="crm-whatsapp-campaigns-page">
        <CampaignHeader />
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
          sessions={sessions}
          tags={tags}
        />
        <CrmWhatsappCampaignBuilder
          campaignName={campaignName}
          canCreate={canCreate}
          canLaunch={canLaunch}
          csvInput={csvInput}
          effectiveSelectedIds={effectiveSelectedIds}
          filteredSessions={filteredSessions}
          initialTagId={initialTagId}
          intervalMinutes={intervalMinutes}
          isSaving={isSaving}
          lastResult={lastResult}
          localError={localError}
          matchedCsvSessionCount={matchedCsvSessionIds.size}
          onCampaignNameChange={setCampaignName}
          onCsvInputChange={setCsvInput}
          onInitialTagChange={setInitialTagId}
          onIntervalMinutesChange={setIntervalMinutes}
          onLaunch={() => void launch()}
          onQueryChange={setQuery}
          onReplyTagChange={setReplyTagId}
          onSecondaryContentChange={setSecondaryContent}
          onSecondaryDelayMinutesChange={setSecondaryDelayMinutes}
          onStartAtChange={setStartAt}
          onTagChange={setSelectedTagId}
          onTextChange={setText}
          onToggleSession={toggleSession}
          preview={
            selectedSessions[0]
              ? renderCampaignMessage(text, selectedSessions[0])
              : text
          }
          query={query}
          replyTagId={replyTagId}
          secondaryContent={secondaryContent}
          secondaryDelayMinutes={secondaryDelayMinutes}
          selectedCount={selectedSessions.length}
          selectedTagId={selectedTagId}
          startAt={startAt}
          tags={tags}
          text={text}
        />
      </div>
    </section>
  );
}
