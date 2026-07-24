import { FileQuestion } from "lucide-react";
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
    <div className="grid gap-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
        <FeatureSearchField
          className="lg:flex-1"
          label="Buscar documento fiscal"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por destinatário, chave ou referência"
          value={search}
        />
        <FeatureSelect<FiscalTypeFilter>
          ariaLabel="Filtrar por tipo de documento"
          className="lg:w-44 lg:shrink-0"
          onChange={setTypeFilter}
          options={fiscalTypeFilterOptions}
          value={typeFilter}
        />
        <FeatureSelect<FiscalStatusFilter>
          ariaLabel="Filtrar por status"
          className="lg:w-48 lg:shrink-0"
          onChange={onStatusFilterChange}
          options={fiscalStatusFilterOptions}
          value={statusFilter}
        />
        <span className="text-xs font-bold text-muted lg:ml-auto lg:shrink-0">
          {filtered.length} {filtered.length === 1 ? "documento" : "documentos"}
        </span>
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
              <thead className="border-b border-line bg-app/45 text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3 font-black">Documento</th>
                  <th className="px-4 py-3 font-black">Destinatário</th>
                  <th className="px-4 py-3 font-black">Valor</th>
                  <th className="px-4 py-3 font-black">Status</th>
                  <th className="px-4 py-3 font-black">Data</th>
                  <th className="px-4 py-3 text-right font-black">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
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

function DocumentTableRow({ document, ...actions }: RowProps) {
  const summary = readDocumentSummary(document);
  return (
    <tr className={cx("transition-colors", summary.rejected && "bg-danger/5")}>
      <td className="px-4 py-3">
        <strong className="block text-app-text font-extrabold">
          {summary.title}
        </strong>
        <span className="mt-0.5 block text-xs font-semibold text-muted">
          {summary.subtitle}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="block font-bold text-app-text">
          {summary.recipientName}
        </span>
        {summary.recipientDocument ? (
          <span className="text-xs font-semibold text-muted">
            {summary.recipientDocument}
          </span>
        ) : null}
      </td>
      <td className="px-4 py-3 font-bold text-app-text">
        {summary.totalLabel}
      </td>
      <td className="px-4 py-3">
        <FeatureStatusBadge tone={summary.statusTone}>
          {summary.statusLabel}
        </FeatureStatusBadge>
        {summary.errorMessage ? (
          <span className="mt-1 block max-w-64 text-xs font-semibold text-danger">
            {summary.errorMessage}
          </span>
        ) : null}
      </td>
      <td className="px-4 py-3 text-xs font-bold text-muted">
        {summary.dateLabel}
      </td>
      <td className="px-4 py-3">
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
        "rounded-2xl border border-line bg-panel p-4 transition-colors",
        summary.rejected && "border-danger/30 bg-danger/5",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <strong className="block text-sm text-app-text font-extrabold">
            {summary.title}
          </strong>
          <span className="mt-0.5 block text-xs font-semibold text-muted">
            {summary.subtitle}
          </span>
        </div>
        <FeatureStatusBadge size="dense" tone={summary.statusTone}>
          {summary.statusLabel}
        </FeatureStatusBadge>
      </div>
      <div className="mt-3 grid gap-1 text-xs font-semibold text-muted">
        <span>
          <span className="font-bold text-app-text">
            {summary.recipientName}
          </span>
          {summary.recipientDocument ? ` · ${summary.recipientDocument}` : ""}
        </span>
        <span>
          {summary.totalLabel} · {summary.dateLabel}
        </span>
      </div>
      {summary.errorMessage ? (
        <div className="mt-3 rounded-lg border border-danger/20 bg-danger/10 p-2 text-xs font-semibold text-danger">
          {summary.errorMessage}
        </div>
      ) : null}
      <div className="mt-3 border-t border-line/45 pt-3">
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
