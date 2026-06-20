import { FileText, RefreshCcw, Search } from "lucide-react";
import type {
  DocumentKind,
  DocumentLinkTarget,
  DocumentStatus,
  ListDocumentsFilters,
  WorkspaceDocument,
} from "./types";
import {
  kindLabel,
  kindOptions,
  statusLabel,
  statusOptions,
  targetLabel,
  targetOptions,
} from "./documentLabels";

export function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="documents-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export function SelectFilter({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <label className="documents-select">
      <span>{label}</span>
      <select onChange={(event) => onChange(event.target.value)} value={value}>
        {options.map((option) => (
          <option key={option.value || "all"} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function DocumentRow({ document }: { document: WorkspaceDocument }) {
  return (
    <article className="documents-row">
      <div>
        <strong>{document.title}</strong>
        <small>{document.file.fileName}</small>
      </div>
      <span>{kindLabel(document.kind)}</span>
      <span className={`documents-status status-${document.status}`}>
        {statusLabel(document.status)}
      </span>
      <span>{targetLabel(document.context.targetType)}</span>
      <time dateTime={document.uploadedAt}>
        {formatDate(document.uploadedAt)}
      </time>
    </article>
  );
}

export function DocumentWorkspacePanel({
  documents,
  isLoading,
  onSelect,
}: {
  documents: WorkspaceDocument[];
  isLoading: boolean;
  onSelect: (document: WorkspaceDocument) => void;
}) {
  return (
    <section className="documents-panel">
      <div className="documents-panel-title">
        <strong>Lista operacional</strong>
      </div>
      {isLoading ? (
        <p className="documents-muted">Carregando documentos.</p>
      ) : documents.length === 0 ? (
        <p className="documents-empty">Nenhum documento encontrado.</p>
      ) : (
        <div className="documents-table">
          {documents.map((document) => (
            <button
              className="documents-row-action"
              key={document.id}
              onClick={() => onSelect(document)}
              type="button"
            >
              <DocumentRow document={document} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export function DocumentsWorkspaceHeader({
  counts,
  filters,
  onRefresh,
  updateFilter,
}: {
  counts: {
    contexts: number;
    issued: number;
    signature: number;
    total: number;
  };
  filters: ListDocumentsFilters;
  onRefresh: () => void;
  updateFilter: <Key extends keyof ListDocumentsFilters>(
    key: Key,
    value: ListDocumentsFilters[Key],
  ) => void;
}) {
  return (
    <>
      <section className="documents-hero">
        <div>
          <span className="documents-badge">
            <FileText aria-hidden="true" className="size-4" />
            Workspace
          </span>
          <h2>Documentos compartilhados</h2>
          <p>
            Arquivos vinculados a veiculos, leads, vendas, pagamentos,
            financeiro e fiscal em uma unica lista auditada.
          </p>
        </div>
        <button
          aria-label="Atualizar documentos"
          className="documents-icon-action"
          onClick={onRefresh}
          title="Atualizar documentos"
          type="button"
        >
          <RefreshCcw aria-hidden="true" className="size-5" />
        </button>
      </section>

      <section className="documents-summary" aria-label="Resumo de documentos">
        <Metric label="Total" value={String(counts.total)} />
        <Metric label="Emitidos" value={String(counts.issued)} />
        <Metric label="Assinatura" value={String(counts.signature)} />
        <Metric label="Contextos" value={String(counts.contexts)} />
      </section>

      <section className="documents-toolbar" aria-label="Filtros">
        <label className="documents-search">
          <Search aria-hidden="true" className="size-4" />
          <input
            onChange={(event) => updateFilter("search", event.target.value)}
            placeholder="Buscar por titulo ou arquivo"
            value={filters.search ?? ""}
          />
        </label>
        <SelectFilter
          label="Tipo"
          onChange={(value) => updateFilter("kind", value as DocumentKind | "")}
          options={kindOptions}
          value={filters.kind ?? ""}
        />
        <SelectFilter
          label="Status"
          onChange={(value) =>
            updateFilter("status", value as DocumentStatus | "")
          }
          options={statusOptions}
          value={filters.status ?? ""}
        />
        <SelectFilter
          label="Contexto"
          onChange={(value) =>
            updateFilter("targetType", value as DocumentLinkTarget | "")
          }
          options={targetOptions}
          value={filters.targetType ?? ""}
        />
      </section>
    </>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(value));
}
