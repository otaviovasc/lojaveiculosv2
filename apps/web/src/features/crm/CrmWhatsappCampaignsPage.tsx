import { useCallback, useEffect, useMemo, useState } from "react";
import { ScheduleList } from "./CrmWhatsappScheduleMessageList";
import {
  CampaignCsvPanel,
  CampaignHeader,
  CampaignMessagePanel,
  CampaignRecipientsPanel,
  CampaignStats,
} from "./CrmWhatsappCampaignsPageParts";
import { CampaignReviewPanel } from "./CrmWhatsappCampaignReviewPanel";
import {
  matchCampaignCsvRows,
  parseCampaignCsv,
  renderCampaignMessage,
} from "./CrmWhatsappCampaignsPageUtils";
import { formatSessionName } from "./crmWhatsappModel";
import type {
  CrmWhatsappListScheduledMessagesInput,
  CrmWhatsappScheduledMessage,
  CrmWhatsappSession,
  CrmWhatsappTag,
} from "./crmWhatsappTypes";

export function CrmWhatsappCampaignsPage({
  canCancel,
  canCreate,
  canRead,
  connectionId,
  onCancel,
  onList,
  onSchedule,
  sessions,
  tags,
}: {
  canCancel: boolean;
  canCreate: boolean;
  canRead: boolean;
  connectionId: string | null;
  onCancel: (scheduledMessageId: string) => Promise<boolean>;
  onList: (
    input?: CrmWhatsappListScheduledMessagesInput,
  ) => Promise<CrmWhatsappScheduledMessage[]>;
  onSchedule: (input: {
    scheduledAt: string;
    sessionId: string;
    text: string;
  }) => Promise<boolean>;
  sessions: CrmWhatsappSession[];
  tags: CrmWhatsappTag[];
}) {
  const [csvInput, setCsvInput] = useState("");
  const [messages, setMessages] = useState<CrmWhatsappScheduledMessage[]>([]);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedTagId, setSelectedTagId] = useState("all");
  const [startAt, setStartAt] = useState("");
  const [intervalMinutes, setIntervalMinutes] = useState(2);
  const [text, setText] = useState("Ola {nome}, tudo bem?");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const loadMessages = useCallback(async () => {
    if (!canRead) return;
    setIsLoading(true);
    try {
      setMessages(
        await onList({
          ...(connectionId ? { connectionId } : {}),
          limit: 100,
        }),
      );
    } finally {
      setIsLoading(false);
    }
  }, [canRead, connectionId, onList]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

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
    canCreate && selectedSessions.length && startAt && text.trim() && !isSaving,
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
    const created = await scheduleCampaignMessages({
      firstDate,
      intervalMinutes,
      onSchedule,
      selectedSessions,
      text,
    });
    setIsSaving(false);
    setLastResult(`${created} de ${selectedSessions.length} envios agendados.`);
    if (created) {
      setSelectedIds(new Set());
      await loadMessages();
    }
  };

  return (
    <section className="crm-whatsapp-section">
      <div className="crm-whatsapp-campaigns-page">
        <CampaignHeader />
        <CampaignStats messages={messages} />
        <div className="crm-whatsapp-campaign-layout">
          <CampaignMessagePanel
            canCreate={canCreate}
            intervalMinutes={intervalMinutes}
            isSaving={isSaving}
            onIntervalMinutesChange={setIntervalMinutes}
            onStartAtChange={setStartAt}
            onTextChange={setText}
            startAt={startAt}
            text={text}
          />
          <CampaignRecipientsPanel
            effectiveSelectedIds={effectiveSelectedIds}
            filteredSessions={filteredSessions}
            onQueryChange={setQuery}
            onTagChange={setSelectedTagId}
            onToggleSession={toggleSession}
            query={query}
            selectedTagId={selectedTagId}
            tags={tags}
          />
          <CampaignCsvPanel
            csvInput={csvInput}
            matchedCount={matchedCsvSessionIds.size}
            onCsvInputChange={setCsvInput}
          />
          <CampaignReviewPanel
            canLaunch={canLaunch}
            intervalMinutes={intervalMinutes}
            isSaving={isSaving}
            lastResult={lastResult}
            localError={localError}
            onLaunch={() => void launch()}
            preview={
              selectedSessions[0]
                ? renderCampaignMessage(text, selectedSessions[0])
                : text
            }
            selectedCount={selectedSessions.length}
          />
        </div>
        <section className="crm-whatsapp-campaign-panel">
          <h3>Agendamentos recentes</h3>
          <ScheduleList
            canCancel={canCancel}
            cancellingId={null}
            isLoading={isLoading}
            messages={messages}
            onCancel={async (id) => {
              await onCancel(id);
              await loadMessages();
            }}
            sessions={sessions}
          />
        </section>
      </div>
    </section>
  );
}

function matchesCampaignFilters(
  session: CrmWhatsappSession,
  query: string,
  selectedTagId: string,
) {
  const normalizedQuery = query.trim().toLowerCase();
  const matchesQuery =
    !normalizedQuery ||
    formatSessionName(session).toLowerCase().includes(normalizedQuery) ||
    (session.buyerPhone ?? "").includes(normalizedQuery);
  const matchesTag =
    selectedTagId === "all" ||
    session.sessionTags?.some((tag) => tag.id === selectedTagId);
  return matchesQuery && matchesTag;
}

async function scheduleCampaignMessages(input: {
  firstDate: Date;
  intervalMinutes: number;
  onSchedule: (input: {
    scheduledAt: string;
    sessionId: string;
    text: string;
  }) => Promise<boolean>;
  selectedSessions: CrmWhatsappSession[];
  text: string;
}) {
  let created = 0;
  for (const [index, session] of input.selectedSessions.entries()) {
    const scheduledAt = new Date(
      input.firstDate.getTime() + index * input.intervalMinutes * 60_000,
    );
    const accepted = await input.onSchedule({
      scheduledAt: scheduledAt.toISOString(),
      sessionId: String(session.id),
      text: renderCampaignMessage(input.text, session),
    });
    if (accepted) created++;
  }
  return created;
}
