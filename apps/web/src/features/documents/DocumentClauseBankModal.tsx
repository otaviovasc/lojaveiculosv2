import { BookOpen, Plus, Search, X } from "lucide-react";
import { useState } from "react";
import {
  PREMADE_CLAUSES,
  renderSampleText,
  type TemplateClauseGroup,
} from "./documentBuilderModel";
import { getFriendlyVariableLabel } from "./DocumentRichTextBlockEditor";
import { DocumentsDialogShell } from "./DocumentsDialogShell";

export type ClauseBankSelection = {
  body: string;
  label: string;
};

const FILTER_ALL = "all";
const FILTER_RECOMMENDED = "recommended";

export function DocumentClauseBankModal({
  clauseBank,
  onClose,
  onInsert,
}: {
  clauseBank: readonly TemplateClauseGroup[];
  onClose: () => void;
  onInsert: (selection: ClauseBankSelection) => void;
}) {
  const [filter, setFilter] = useState<string>(FILTER_ALL);
  const [search, setSearch] = useState("");

  const query = search.trim().toLocaleLowerCase("pt-BR");
  const matchesQuery = (label: string, body: string) =>
    query.length === 0 ||
    label.toLocaleLowerCase("pt-BR").includes(query) ||
    body.toLocaleLowerCase("pt-BR").includes(query);

  const recommended = PREMADE_CLAUSES.filter((clause) =>
    matchesQuery(clause.title, clause.body),
  );
  const showRecommended =
    (filter === FILTER_ALL || filter === FILTER_RECOMMENDED) &&
    recommended.length > 0;

  const visibleGroups = clauseBank
    .filter((group) => filter === FILTER_ALL || group.templateKey === filter)
    .map((group) => ({
      ...group,
      clauses: group.clauses.filter((clause) =>
        matchesQuery(clause.label, clause.body),
      ),
    }))
    .filter((group) => group.clauses.length > 0);

  const isEmpty = !showRecommended && visibleGroups.length === 0;

  return (
    <DocumentsDialogShell
      backdropClassName="documents-detail-modal-backdrop"
      className="documents-clause-bank-dialog"
      onClose={onClose}
      title="Banco de Cláusulas"
    >
      <header className="flex items-center justify-between border-b border-line pb-4 mb-4">
        <div className="flex items-center gap-2.5">
          <BookOpen className="size-5 text-accent-strong" />
          <div>
            <h2 className="text-lg font-black text-app-text m-0">
              Banco de Cláusulas
            </h2>
            <p className="text-xs text-muted font-semibold m-0">
              Insira cláusulas prontas dos modelos do sistema ou recomendações
              jurídicas.
            </p>
          </div>
        </div>
        <button
          aria-label="Fechar banco de cláusulas"
          className="documents-icon-button"
          onClick={onClose}
          type="button"
        >
          <X className="size-5" />
        </button>
      </header>

      <label className="documents-clause-bank-search">
        <Search aria-hidden="true" className="size-4 shrink-0" />
        <input
          aria-label="Buscar cláusula"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar cláusula…"
          type="search"
          value={search}
        />
      </label>

      <div
        aria-label="Filtrar cláusulas"
        className="documents-clause-bank-filters"
        role="toolbar"
      >
        <FilterChip
          isActive={filter === FILTER_ALL}
          label="Todas"
          onSelect={() => setFilter(FILTER_ALL)}
        />
        <FilterChip
          isActive={filter === FILTER_RECOMMENDED}
          label="Recomendadas"
          onSelect={() => setFilter(FILTER_RECOMMENDED)}
        />
        {clauseBank.map((group) => (
          <FilterChip
            isActive={filter === group.templateKey}
            key={group.templateKey}
            label={group.templateTitle}
            onSelect={() => setFilter(group.templateKey)}
          />
        ))}
      </div>

      <div className="documents-clause-bank-list">
        {showRecommended ? (
          <section className="documents-clause-bank-section">
            <h3 className="documents-clause-bank-section-title">
              Recomendadas
            </h3>
            {recommended.map((clause) => (
              <article
                className="documents-clause-bank-card"
                key={clause.title}
              >
                <header className="documents-clause-bank-card-header">
                  <div>
                    <strong>{clause.title}</strong>
                    <span className="documents-clause-bank-badge">
                      {clause.category}
                    </span>
                  </div>
                  <InsertClauseButton
                    onInsert={() =>
                      onInsert({ body: clause.body, label: clause.title })
                    }
                  />
                </header>
                <p className="documents-clause-bank-description">
                  {clause.description}
                </p>
                <ClauseBankPreview body={clause.body} />
              </article>
            ))}
          </section>
        ) : null}

        {visibleGroups.map((group) => (
          <section
            className="documents-clause-bank-section"
            key={group.templateKey}
          >
            <h3 className="documents-clause-bank-section-title">
              {group.templateTitle}
            </h3>
            {group.clauses.map((clause) => (
              <article
                className="documents-clause-bank-card"
                key={`${group.templateKey}-${clause.label}`}
              >
                <header className="documents-clause-bank-card-header">
                  <div>
                    <strong>{clause.label}</strong>
                    <span className="documents-clause-bank-template-tag">
                      {group.templateTitle}
                    </span>
                  </div>
                  <InsertClauseButton
                    onInsert={() =>
                      onInsert({ body: clause.body, label: clause.label })
                    }
                  />
                </header>
                <ClauseBankPreview body={clause.body} />
              </article>
            ))}
          </section>
        ))}

        {isEmpty ? (
          <p className="documents-clause-bank-empty" role="status">
            Nenhuma cláusula encontrada.
          </p>
        ) : null}
      </div>
    </DocumentsDialogShell>
  );
}

function FilterChip({
  isActive,
  label,
  onSelect,
}: {
  isActive: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <button
      aria-pressed={isActive}
      className="documents-clause-bank-filter"
      data-active={isActive}
      onClick={onSelect}
      type="button"
    >
      {label}
    </button>
  );
}

function InsertClauseButton({ onInsert }: { onInsert: () => void }) {
  return (
    <button
      className="px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-black hover:bg-accent-strong hover:text-accent-strong-foreground transition-colors flex items-center gap-1.5 shrink-0"
      onClick={onInsert}
      type="button"
    >
      <Plus className="size-3.5" />
      Inserir
    </button>
  );
}

function ClauseBankPreview({ body }: { body: string }) {
  const tokens = extractBodyTokens(body);
  return (
    <div>
      <p className="documents-clause-bank-preview font-serif italic">
        {renderSampleText(body)}
      </p>
      {tokens.length ? (
        <div className="documents-clause-bank-tokens">
          {tokens.map((token) => (
            <span className="documents-variable-chip-btn" key={token}>
              {getFriendlyVariableLabel(token)}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function extractBodyTokens(body: string): string[] {
  return [...new Set(body.match(/\{\{[^{}]+\}\}/g) ?? [])];
}
