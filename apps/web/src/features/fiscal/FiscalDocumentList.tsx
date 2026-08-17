import { FileQuestion, FileText, ReceiptText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  FeatureSearchField,
  FeatureSelect,
} from "../../components/ui/FeatureControls";
import { cx } from "../../components/ui/featureShared";
import {
  FeatureEmptyState,
  FeatureStatusBadge,
} from "../../components/ui/FeatureStates";
import { FeatureTableFrame } from "../../components/ui/FeatureTable";
import "../../styles/fiscal-documents.css";
import type { FiscalApi } from "./apiClient";
import { FiscalDocumentActions } from "./FiscalDocumentActions";
import {
  fiscalStatusFilterOptions,
  fiscalTypeFilterOptions,
  isPendingSyncStatus,
  isRejectedLikeStatus,
  matchesDocumentSearch,
  matchesStatusFilter,
  readDocumentDescription,
  readDocumentError,
  readDocumentRecipientDocument,
  readDocumentRecipientName,
  readDocumentTotal,
  readExternalReference,
  type FiscalStatusFilter,
  type FiscalTypeFilter,
} from "./fiscalDocumentDisplay";
import { formatBrl } from "./fiscalIssueModel";
import {
  formatFiscalDate,
  getFiscalDocumentKindLabel,
  getFiscalDocumentStatusLabel,
  getFiscalDocumentStatusTone,
  getFiscalDocumentTypeLabel,
} from "./fiscalLabels";
import type { FiscalDocument } from "./types";

export const FISCAL_STATUS_POLL_INTERVAL_MS = 10_000;

type FiscalDocumentListProps = {
  api: FiscalApi;
  documents: readonly FiscalDocument[];
  onCorrect: (document: FiscalDocument) => void;
  onError: (message: string) => void;
  onRefresh: () => Promise<void>;
  onStatusFilterChange: (filter: FiscalStatusFilter) => void;
  statusFilter: FiscalStatusFilter;
};

type RowProps = {
  api: FiscalApi;
  document: FiscalDocument;
  onCorrect: (document: FiscalDocument) => void;
  onError: (message: string) => void;
  onRefresh: () => Promise<void>;
};

export function FiscalDocumentList({
  api,
  documents,
  onCorrect,
  onError,
  onRefresh,
  onStatusFilterChange,
  statusFilter,
}: FiscalDocumentListProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<FiscalTypeFilter>("all");

  const pollingIds = useMemo(
    () =>
      documents
        .filter(
          (document) =>
            !!document.providerDocumentId &&
            isPendingSyncStatus(document.status),
        )
        .map((document) => document.id)
        .join(","),
    [documents],
  );

  useEffect(() => {
    if (!pollingIds) return undefined;
    const ids = pollingIds.split(",");
    const intervalId = setInterval(() => {
      // Status sync is best-effort: polling errors never surface as page
      // errors, and no synthetic status is shown while the provider is
      // unreachable.
      void Promise.allSettled(
        ids.map((id) => api.syncDocumentStatus(id, {})),
      ).then(() => onRefresh());
    }, FISCAL_STATUS_POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [api, onRefresh, pollingIds]);

  const statusCounts = useMemo(() => {
    const counts = new Map<FiscalStatusFilter, number>();
    for (const option of fiscalStatusFilterOptions) {
      counts.set(
        option.value,
        option.value === "all"
          ? documents.length
          : documents.filter((document) =>
              matchesStatusFilter(document.status, option.value),
            ).length,
      );
    }
    return counts;
  }, [documents]);

  const filtered = documents.filter((document) => {
    const matchesType =
      typeFilter === "all" || document.documentKind === typeFilter;
    return (
      matchesType &&
      matchesStatusFilter(document.status, statusFilter) &&
      matchesDocumentSearch(document, search)
    );
  });

  const rowProps = { api, onCorrect, onError, onRefresh };

  return (
    <div className="fiscal-docs">
      <div className="fiscal-docs-toolbar">
        <FeatureSearchField
          className="min-w-[240px] flex-1 sm:min-w-[320px]"
          label="Buscar documento fiscal"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por destinatário, chave ou referência"
          value={search}
        />
        <FeatureSelect<FiscalTypeFilter>
          ariaLabel="Filtrar por tipo de documento"
          className="w-full shrink-0 sm:w-48"
          onChange={setTypeFilter}
          options={fiscalTypeFilterOptions}
          value={typeFilter}
        />
        <span className="fiscal-docs-count sm:ml-auto">
          <strong>{filtered.length}</strong>
          {filtered.length === 1 ? "documento" : "documentos"}
        </span>
      </div>

      <div
        aria-label="Filtrar por status"
        className="fiscal-status-chips"
        role="group"
      >
        {fiscalStatusFilterOptions.map((option) => (
          <button
            aria-pressed={statusFilter === option.value}
            className="fiscal-status-chip"
            key={option.value}
            onClick={() => onStatusFilterChange(option.value)}
            type="button"
          >
            {option.label}
            <span aria-hidden="true" className="fiscal-status-chip__count">
              {statusCounts.get(option.value) ?? 0}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <FeatureEmptyState
          body={
            documents.length === 0
              ? "As notas emitidas pela loja aparecerão aqui depois da primeira operação fiscal."
              : "Nenhum documento corresponde aos filtros aplicados. Ajuste a busca ou o status selecionado."
          }
          density="compact"
          icon={FileQuestion}
          title={
            documents.length === 0
              ? "Nenhum documento fiscal"
              : "Nenhum documento encontrado"
          }
        />
      ) : (
        <>
          <FeatureTableFrame className="hidden md:block">
            <table className="w-full min-w-[880px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-app-elevated/50 text-xs font-bold uppercase tracking-wider text-muted">
                  <th className="p-3.5 pl-4">Documento</th>
                  <th className="p-3.5">Destinatário</th>
                  <th className="p-3.5">Valor</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Data</th>
                  <th className="p-3.5 pr-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/40">
                {filtered.map((document) => (
                  <DocumentTableRow
                    document={document}
                    key={document.id}
                    {...rowProps}
                  />
                ))}
              </tbody>
            </table>
          </FeatureTableFrame>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:hidden">
            {filtered.map((document) => (
              <DocumentCard
                document={document}
                key={document.id}
                {...rowProps}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DocumentKindIcon({
  kind,
  rejected,
}: {
  kind: FiscalDocument["documentKind"];
  rejected: boolean;
}) {
  const Icon = kind === "nfse" ? ReceiptText : FileText;
  return (
    <span
      aria-hidden="true"
      className={cx("fiscal-doc-kind", rejected && "fiscal-doc-kind--danger")}
    >
      <Icon className="size-4" />
    </span>
  );
}

function DocumentTableRow({ document, ...actions }: RowProps) {
  const summary = readDocumentSummary(document);
  return (
    <tr
      className={cx(
        "group transition-colors hover:bg-app-elevated/40",
        summary.rejected && "bg-danger/5",
      )}
    >
      <td className="p-3.5 pl-4">
        <div className="flex items-center gap-3">
          <DocumentKindIcon
            kind={document.documentKind}
            rejected={summary.rejected}
          />
          <div className="min-w-0">
            <strong className="fiscal-doc-title">{summary.title}</strong>
            <span className="fiscal-doc-subtitle">{summary.subtitle}</span>
          </div>
        </div>
      </td>
      <td className="p-3.5">
        <span className="block font-bold text-app-text">
          {summary.recipientName}
        </span>
        {summary.recipientDocument ? (
          <span className="text-xs font-semibold text-muted">
            {summary.recipientDocument}
          </span>
        ) : null}
      </td>
      <td className="p-3.5">
        <span className="fiscal-doc-total">{summary.totalLabel}</span>
      </td>
      <td className="p-3.5">
        <FeatureStatusBadge size="dense" tone={summary.statusTone}>
          {summary.statusLabel}
        </FeatureStatusBadge>
        {summary.errorMessage ? (
          <span className="fiscal-doc-error">{summary.errorMessage}</span>
        ) : null}
      </td>
      <td className="p-3.5 text-xs font-bold text-muted">
        {summary.dateLabel}
      </td>
      <td className="p-3.5 pr-4">
        <FiscalDocumentActions document={document} {...actions} />
      </td>
    </tr>
  );
}

function DocumentCard({ document, ...actions }: RowProps) {
  const summary = readDocumentSummary(document);
  return (
    <article
      className={cx(
        "fiscal-doc-card",
        summary.rejected && "fiscal-doc-card--rejected",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <DocumentKindIcon
            kind={document.documentKind}
            rejected={summary.rejected}
          />
          <div className="min-w-0">
            <strong className="fiscal-doc-title">{summary.title}</strong>
            <span className="fiscal-doc-subtitle">{summary.subtitle}</span>
          </div>
        </div>
        <FeatureStatusBadge size="dense" tone={summary.statusTone}>
          {summary.statusLabel}
        </FeatureStatusBadge>
      </div>
      <div className="fiscal-doc-card__meta">
        <span>
          <strong>{summary.recipientName}</strong>
          {summary.recipientDocument ? ` · ${summary.recipientDocument}` : ""}
        </span>
        <span>
          {summary.totalLabel} · {summary.dateLabel}
        </span>
      </div>
      {summary.errorMessage ? (
        <div className="fiscal-doc-card__error">{summary.errorMessage}</div>
      ) : null}
      <div className="fiscal-doc-card__actions">
        <FiscalDocumentActions document={document} {...actions} />
      </div>
    </article>
  );
}

function readDocumentSummary(document: FiscalDocument) {
  const kindLabel = getFiscalDocumentKindLabel(document.documentKind);
  const description = readDocumentDescription(document);
  const reference =
    readExternalReference(document) ??
    (document.accessKey
      ? `Chave de acesso …${document.accessKey.slice(-8)}`
      : null);
  const total = readDocumentTotal(document);
  const rejected = isRejectedLikeStatus(document.status);
  return {
    dateLabel: formatFiscalDate(document.issuedAt ?? document.createdAt),
    errorMessage: rejected ? readDocumentError(document) : null,
    recipientDocument: readDocumentRecipientDocument(document),
    recipientName:
      readDocumentRecipientName(document) ?? "Destinatário não informado",
    rejected,
    statusLabel: getFiscalDocumentStatusLabel(document.status),
    statusTone: getFiscalDocumentStatusTone(document.status),
    subtitle: [description, reference].filter(Boolean).join(" · ") || "—",
    title: `${kindLabel} · ${getFiscalDocumentTypeLabel(document.documentType)}`,
    totalLabel: total !== null ? formatBrl(total) : "—",
  };
}
