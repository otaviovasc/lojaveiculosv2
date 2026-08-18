import { formatCycleName } from "./crmConversationModel";
import type { CampaignCsvRow } from "./CrmCampaignsPageUtils";
import type { CrmConversationCycle } from "./crmConversationTypes";

export type CampaignRecipientReviewRow = {
  id: string;
  included: boolean;
  issues: string[];
  name: string;
  phone: string;
  rawPhone: string;
  cycle: CrmConversationCycle | null;
  cycleId: string | null;
  source: "conversation" | "csv";
  status: "blocked" | "ready" | "warning";
};

export type CampaignRecipientReviewSummary = {
  blockedIncluded: number;
  included: number;
  ready: number;
  total: number;
  warnings: number;
};

export function buildCampaignRecipientReviewRows(input: {
  csvRows: CampaignCsvRow[];
  excludedRowIds: Set<string>;
  nameOverrides: Record<string, string>;
  selectedCycleIds: Set<string>;
  conversationCycles: CrmConversationCycle[];
}): CampaignRecipientReviewRow[] {
  const sessionsByPhone = new Map(
    input.conversationCycles.map((cycle) => [
      normalizeCampaignPhone(cycle.customerPhone ?? ""),
      cycle,
    ]),
  );
  const manualRows = input.conversationCycles
    .filter((cycle) => input.selectedCycleIds.has(String(cycle.id)))
    .map((cycle) =>
      buildReviewRow({
        excludedRowIds: input.excludedRowIds,
        id: `cycle:${String(cycle.id)}`,
        nameOverrides: input.nameOverrides,
        rawPhone: cycle.customerPhone ?? "",
        cycle,
        source: "conversation",
      }),
    );
  const csvRows = input.csvRows.map((row, index) => {
    const cycle = sessionsByPhone.get(row.phone) ?? null;
    return buildReviewRow({
      excludedRowIds: input.excludedRowIds,
      id: `csv:${index}:${row.phone || row.rawPhone}`,
      nameOverrides: input.nameOverrides,
      rawPhone: row.rawPhone,
      cycle,
      source: "csv",
      submittedName: row.name,
    });
  });
  return markDuplicateRows([...manualRows, ...csvRows]);
}

export function summarizeCampaignRecipientReview(
  rows: CampaignRecipientReviewRow[],
): CampaignRecipientReviewSummary {
  return rows.reduce(
    (acc, row) => ({
      blockedIncluded:
        acc.blockedIncluded +
        (row.included && row.status === "blocked" ? 1 : 0),
      included: acc.included + (row.included ? 1 : 0),
      ready: acc.ready + (row.included && row.status !== "blocked" ? 1 : 0),
      total: acc.total + 1,
      warnings:
        acc.warnings + (row.included && row.status === "warning" ? 1 : 0),
    }),
    { blockedIncluded: 0, included: 0, ready: 0, total: 0, warnings: 0 },
  );
}

export function normalizeCampaignPhone(value: string) {
  return value.replace(/\D/g, "");
}

function buildReviewRow(input: {
  excludedRowIds: Set<string>;
  id: string;
  nameOverrides: Record<string, string>;
  rawPhone: string;
  cycle: CrmConversationCycle | null;
  source: CampaignRecipientReviewRow["source"];
  submittedName?: string;
}): CampaignRecipientReviewRow {
  const phone = normalizeCampaignPhone(input.rawPhone);
  const fallbackName =
    input.submittedName?.trim() ||
    (input.cycle ? formatCycleName(input.cycle) : "");
  const name = input.nameOverrides[input.id] ?? fallbackName;
  const issues = baseIssues({
    name,
    phone,
    rawPhone: input.rawPhone,
    cycle: input.cycle,
  });
  return {
    id: input.id,
    included: !input.excludedRowIds.has(input.id),
    issues,
    name,
    phone,
    rawPhone: input.rawPhone,
    cycle: input.cycle,
    cycleId: input.cycle ? String(input.cycle.id) : null,
    source: input.source,
    status: statusFromIssues(issues),
  };
}

function markDuplicateRows(rows: CampaignRecipientReviewRow[]) {
  const seen = new Set<string>();
  return rows.map((row) => {
    const dedupeKey = row.cycleId ?? row.phone;
    if (!dedupeKey || row.status === "blocked") return row;
    if (!seen.has(dedupeKey)) {
      seen.add(dedupeKey);
      return row;
    }
    const issues = [...row.issues, "Duplicado nesta campanha."];
    return { ...row, issues, status: "blocked" as const };
  });
}

function baseIssues(input: {
  name: string;
  phone: string;
  rawPhone: string;
  cycle: CrmConversationCycle | null;
}) {
  const issues: string[] = [];
  if (/\blid\b/i.test(input.rawPhone))
    issues.push("LID nao pode receber campanha.");
  if (!input.phone || input.phone.length < 10)
    issues.push("Telefone invalido.");
  if (!input.cycle)
    issues.push("Conversa V2 nao encontrada para este telefone.");
  if (input.cycle && input.cycle.channel !== "whatsapp")
    issues.push("Campanhas exigem uma conversa do WhatsApp.");
  if (!input.name.trim()) issues.push("Nome ausente; sera usado cliente.");
  return issues;
}

function statusFromIssues(
  issues: string[],
): CampaignRecipientReviewRow["status"] {
  if (
    issues.some(
      (issue) =>
        issue.includes("invalido") ||
        issue.includes("LID") ||
        issue.includes("Duplicado") ||
        issue.includes("nao encontrada") ||
        issue.includes("Campanhas exigem"),
    )
  ) {
    return "blocked";
  }
  return issues.length ? "warning" : "ready";
}
