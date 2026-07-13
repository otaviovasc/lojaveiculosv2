import { useMemo, useState } from "react";
import {
  buildCampaignRecipientReviewRows,
  summarizeCampaignRecipientReview,
} from "./CrmWhatsappCampaignRecipientReview";
import {
  matchCampaignCsvRows,
  parseCampaignCsv,
  renderCampaignMessage,
} from "./CrmWhatsappCampaignsPageUtils";
import type { CrmWhatsappSession } from "./crmWhatsappTypes";

export function useCrmWhatsappCampaignReview({
  campaignName,
  canCreate,
  csvInput,
  filteredSessions,
  isSaving,
  sessions,
  startAt,
  text,
}: {
  campaignName: string;
  canCreate: boolean;
  csvInput: string;
  filteredSessions: CrmWhatsappSession[];
  isSaving: boolean;
  sessions: CrmWhatsappSession[];
  startAt: string;
  text: string;
}) {
  const [excludedRowIds, setExcludedRowIds] = useState<Set<string>>(new Set());
  const [nameOverrides, setNameOverrides] = useState<Record<string, string>>(
    {},
  );
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(
    new Set(),
  );
  const csvRows = useMemo(() => parseCampaignCsv(csvInput), [csvInput]);
  const matchedCsvSessionIds = useMemo(
    () =>
      new Set(
        matchCampaignCsvRows(csvRows, sessions).map((item) => String(item.id)),
      ),
    [csvRows, sessions],
  );
  const effectiveSelectedIds = useMemo(() => {
    const next = new Set(selectedSessionIds);
    for (const id of matchedCsvSessionIds) next.add(id);
    return next;
  }, [matchedCsvSessionIds, selectedSessionIds]);
  const reviewRows = useMemo(
    () =>
      buildCampaignRecipientReviewRows({
        csvRows,
        excludedRowIds,
        nameOverrides,
        selectedSessionIds,
        sessions,
      }),
    [csvRows, excludedRowIds, nameOverrides, selectedSessionIds, sessions],
  );
  const reviewSummary = useMemo(
    () => summarizeCampaignRecipientReview(reviewRows),
    [reviewRows],
  );
  const validRecipients = reviewRows.filter(
    (row) => row.included && row.status !== "blocked" && row.sessionId,
  );
  const canLaunch = Boolean(
    canCreate &&
    campaignName.trim() &&
    validRecipients.length &&
    !reviewSummary.blockedIncluded &&
    startAt &&
    text.trim() &&
    !isSaving,
  );
  const preview = validRecipients[0]?.session
    ? renderCampaignMessage(text, validRecipients[0].session)
    : text;

  const toggleSession = (sessionId: string) => {
    setSelectedSessionIds((current) => toggleSetValue(current, sessionId));
  };
  const toggleReviewRow = (rowId: string) => {
    setExcludedRowIds((current) => toggleSetValue(current, rowId));
  };
  const selectVisibleSessions = () => {
    setSelectedSessionIds((current) => {
      const next = new Set(current);
      for (const session of filteredSessions) next.add(String(session.id));
      return next;
    });
  };
  const updateReviewRowName = (rowId: string, value: string) => {
    setNameOverrides((current) => ({ ...current, [rowId]: value }));
  };
  const resetReview = () => {
    setExcludedRowIds(new Set());
    setNameOverrides({});
    setSelectedSessionIds(new Set());
  };

  return {
    canLaunch,
    effectiveSelectedIds,
    matchedCsvSessionCount: matchedCsvSessionIds.size,
    preview,
    resetReview,
    reviewRows,
    reviewSummary,
    selectVisibleSessions,
    toggleReviewRow,
    toggleSession,
    updateReviewRowName,
    validRecipients,
  };
}

function toggleSetValue(current: Set<string>, value: string) {
  const next = new Set(current);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}
