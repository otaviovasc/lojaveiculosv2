import { useMemo, useState } from "react";
import {
  buildCampaignRecipientReviewRows,
  summarizeCampaignRecipientReview,
} from "./CrmCampaignRecipientReview";
import {
  matchCampaignCsvRows,
  parseCampaignCsv,
  renderCampaignMessage,
} from "./CrmCampaignsPageUtils";
import type { CrmConversationCycle } from "./crmConversationTypes";

export function useCrmCampaignReview({
  campaignName,
  canCreate,
  csvInput,
  filteredSessions,
  isSaving,
  conversationCycles,
  startAt,
  text,
}: {
  campaignName: string;
  canCreate: boolean;
  csvInput: string;
  filteredSessions: CrmConversationCycle[];
  isSaving: boolean;
  conversationCycles: CrmConversationCycle[];
  startAt: string;
  text: string;
}) {
  const [excludedRowIds, setExcludedRowIds] = useState<Set<string>>(new Set());
  const [nameOverrides, setNameOverrides] = useState<Record<string, string>>(
    {},
  );
  const [selectedCycleIds, setSelectedCycleIds] = useState<Set<string>>(
    new Set(),
  );
  const csvRows = useMemo(() => parseCampaignCsv(csvInput), [csvInput]);
  const matchedCsvCycleIds = useMemo(
    () =>
      new Set(
        matchCampaignCsvRows(csvRows, conversationCycles).map((item) =>
          String(item.id),
        ),
      ),
    [csvRows, conversationCycles],
  );
  const effectiveSelectedIds = useMemo(() => {
    const next = new Set(selectedCycleIds);
    for (const id of matchedCsvCycleIds) next.add(id);
    return next;
  }, [matchedCsvCycleIds, selectedCycleIds]);
  const reviewRows = useMemo(
    () =>
      buildCampaignRecipientReviewRows({
        csvRows,
        excludedRowIds,
        nameOverrides,
        selectedCycleIds,
        conversationCycles,
      }),
    [
      csvRows,
      excludedRowIds,
      nameOverrides,
      selectedCycleIds,
      conversationCycles,
    ],
  );
  const reviewSummary = useMemo(
    () => summarizeCampaignRecipientReview(reviewRows),
    [reviewRows],
  );
  const validRecipients = reviewRows.filter(
    (row) => row.included && row.status !== "blocked" && row.cycleId,
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
  const preview = validRecipients[0]?.cycle
    ? renderCampaignMessage(text, validRecipients[0].cycle)
    : text;

  const toggleSession = (cycleId: string) => {
    setSelectedCycleIds((current) => toggleSetValue(current, cycleId));
  };
  const toggleReviewRow = (rowId: string) => {
    setExcludedRowIds((current) => toggleSetValue(current, rowId));
  };
  const selectVisibleSessions = () => {
    setSelectedCycleIds((current) => {
      const next = new Set(current);
      for (const cycle of filteredSessions) next.add(String(cycle.id));
      return next;
    });
  };
  const updateReviewRowName = (rowId: string, value: string) => {
    setNameOverrides((current) => ({ ...current, [rowId]: value }));
  };
  const resetReview = () => {
    setExcludedRowIds(new Set());
    setNameOverrides({});
    setSelectedCycleIds(new Set());
  };

  return {
    canLaunch,
    effectiveSelectedIds,
    matchedCsvSessionCount: matchedCsvCycleIds.size,
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
