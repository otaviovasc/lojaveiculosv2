import { formatSessionName } from "./crmWhatsappModel";
import type { CampaignCsvRow } from "./CrmWhatsappCampaignsPageUtils";
import type { CrmWhatsappSession } from "./crmWhatsappTypes";

export type CampaignRecipientReviewRow = {
  id: string;
  included: boolean;
  issues: string[];
  name: string;
  phone: string;
  rawPhone: string;
  session: CrmWhatsappSession | null;
  sessionId: string | null;
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
  selectedSessionIds: Set<string>;
  sessions: CrmWhatsappSession[];
}): CampaignRecipientReviewRow[] {
  const sessionsByPhone = new Map(
    input.sessions.map((session) => [
      normalizeCampaignPhone(session.buyerPhone ?? ""),
      session,
    ]),
  );
  const manualRows = input.sessions
    .filter((session) => input.selectedSessionIds.has(String(session.id)))
    .map((session) =>
      buildReviewRow({
        excludedRowIds: input.excludedRowIds,
        id: `session:${String(session.id)}`,
        nameOverrides: input.nameOverrides,
        rawPhone: session.buyerPhone ?? "",
        session,
        source: "conversation",
      }),
    );
  const csvRows = input.csvRows.map((row, index) => {
    const session = sessionsByPhone.get(row.phone) ?? null;
    return buildReviewRow({
      excludedRowIds: input.excludedRowIds,
      id: `csv:${index}:${row.phone || row.rawPhone}`,
      nameOverrides: input.nameOverrides,
      rawPhone: row.rawPhone,
      session,
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
  session: CrmWhatsappSession | null;
  source: CampaignRecipientReviewRow["source"];
  submittedName?: string;
}): CampaignRecipientReviewRow {
  const phone = normalizeCampaignPhone(input.rawPhone);
  const fallbackName =
    input.submittedName?.trim() ||
    (input.session ? formatSessionName(input.session) : "");
  const name = input.nameOverrides[input.id] ?? fallbackName;
  const issues = baseIssues({
    name,
    phone,
    rawPhone: input.rawPhone,
    session: input.session,
  });
  return {
    id: input.id,
    included: !input.excludedRowIds.has(input.id),
    issues,
    name,
    phone,
    rawPhone: input.rawPhone,
    session: input.session,
    sessionId: input.session ? String(input.session.id) : null,
    source: input.source,
    status: statusFromIssues(issues),
  };
}

function markDuplicateRows(rows: CampaignRecipientReviewRow[]) {
  const seen = new Set<string>();
  return rows.map((row) => {
    const dedupeKey = row.sessionId ?? row.phone;
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
  session: CrmWhatsappSession | null;
}) {
  const issues: string[] = [];
  if (/\blid\b/i.test(input.rawPhone))
    issues.push("LID nao pode receber campanha.");
  if (!input.phone || input.phone.length < 10)
    issues.push("Telefone invalido.");
  if (!input.session)
    issues.push("Conversa V2 nao encontrada para este telefone.");
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
        issue.includes("nao encontrada"),
    )
  ) {
    return "blocked";
  }
  return issues.length ? "warning" : "ready";
}
