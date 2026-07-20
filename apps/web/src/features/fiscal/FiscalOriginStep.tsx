import { Banknote, FileText, HandCoins, Link2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  FeatureSearchField,
  FeatureSegmentedControl,
} from "../../components/ui/FeatureControls";
import {
  FeatureField,
  FeatureFormSection,
} from "../../components/ui/FeatureForms";
import { FeatureInput } from "../../components/ui/FeatureControls";
import {
  FeatureAlert,
  FeatureLoadingState,
  FeatureStatusBadge,
} from "../../components/ui/FeatureStates";
import type { FinanceEntry } from "../finance/types";
import type { SaleRecord } from "../sales/types";
import {
  describeEntryForSearch,
  describeSaleForSearch,
  matchesEntryQuery,
  matchesSaleQuery,
  type FiscalIssueDraft,
  type IssueDocumentKind,
  type IssueOriginType,
} from "./fiscalIssueModel";

export type OriginListStatus = "error" | "idle" | "loading" | "ready";

export function FiscalOriginStep({
  disabled,
  draft,
  entries,
  entriesStatus,
  onChange,
  onSelectEntry,
  onSelectSale,
  sales,
  salesStatus,
}: {
  disabled?: boolean;
  draft: FiscalIssueDraft;
  entries: readonly FinanceEntry[];
  entriesStatus: OriginListStatus;
  onChange: (patch: Partial<FiscalIssueDraft>) => void;
  onSelectEntry: (entry: FinanceEntry) => void;
  onSelectSale: (sale: SaleRecord) => void;
  sales: readonly SaleRecord[];
  salesStatus: OriginListStatus;
}) {
  const [query, setQuery] = useState("");

  const saleResults = useMemo(() => {
    if (!query.trim()) return sales.slice(0, 8);
    return sales.filter((sale) => matchesSaleQuery(sale, query)).slice(0, 8);
  }, [query, sales]);

  const entryResults = useMemo(() => {
    if (!query.trim()) return entries.slice(0, 8);
    return entries
      .filter((entry) => matchesEntryQuery(entry, query))
      .slice(0, 8);
  }, [entries, query]);

  const selectedSale = draft.saleId
    ? sales.find((sale) => sale.id === draft.saleId)
    : null;
  const selectedEntry = draft.entryId
    ? entries.find((entry) => entry.id === draft.entryId)
    : null;

  return (
    <>
      <FeatureFormSection
        description="Escolha o tipo de documento e a operação real que origina a nota."
        title="Origem da emissão"
      >
        <div className="grid gap-4">
          <FeatureField as="div" label="Tipo de nota">
            <FeatureSegmentedControl<IssueDocumentKind>
              ariaLabel="Tipo de nota"
              disabled={disabled}
              onChange={(kind) => onChange({ kind })}
              options={[
                { icon: FileText, label: "NF-e (produto)", value: "nfe" },
                { icon: HandCoins, label: "NFS-e (serviço)", value: "nfse" },
              ]}
              value={draft.kind}
            />
          </FeatureField>
          <FeatureField as="div" label="Origem">
            <FeatureSegmentedControl<IssueOriginType>
              ariaLabel="Origem da nota"
              disabled={disabled}
              onChange={(origin) => onChange({ origin })}
              options={[
                { icon: Banknote, label: "Venda", value: "sale" },
                { icon: HandCoins, label: "Lançamento", value: "entry" },
                { icon: Link2, label: "Avulsa", value: "standalone" },
              ]}
              value={draft.origin}
            />
          </FeatureField>
        </div>
      </FeatureFormSection>

      {draft.origin === "sale" ? (
        <FeatureFormSection
          description="A venda selecionada preenche destinatário, veículo, itens e pagamentos da nota."
          title="Venda vinculada"
        >
          <div className="grid gap-3">
            <FeatureSearchField
              aria-label="Buscar venda"
              disabled={disabled}
              label="Buscar venda"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por veículo, comprador ou placa"
              value={query}
            />
            {salesStatus === "loading" ? (
              <FeatureLoadingState>Carregando vendas</FeatureLoadingState>
            ) : null}
            {salesStatus === "error" ? (
              <FeatureAlert>
                Não foi possível carregar as vendas da loja. Nenhuma emissão foi
                iniciada.
              </FeatureAlert>
            ) : null}
            {salesStatus === "ready" && saleResults.length === 0 ? (
              <p className="text-sm font-semibold text-muted">
                Nenhuma venda encontrada para esta busca.
              </p>
            ) : null}
            <ul className="grid gap-2">
              {saleResults.map((sale) => {
                const view = describeSaleForSearch(sale);
                const active = draft.saleId === sale.id;
                return (
                  <li key={sale.id}>
                    <button
                      aria-pressed={active}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-app px-3 py-2 text-left outline-none focus:shadow-[var(--shadow-focus)]"
                      disabled={disabled}
                      onClick={() => onSelectSale(sale)}
                      type="button"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-app-text">
                          {view.label}
                        </span>
                        <span className="block truncate text-xs font-semibold text-muted">
                          {view.detail || "Venda sem detalhes"}
                        </span>
                      </span>
                      {active ? (
                        <FeatureStatusBadge tone="success">
                          Selecionada
                        </FeatureStatusBadge>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
            {selectedSale ? (
              <p className="text-xs font-semibold text-muted">
                Referência externa: sale:{selectedSale.id}
              </p>
            ) : null}
          </div>
        </FeatureFormSection>
      ) : null}

      {draft.origin === "entry" ? (
        <FeatureFormSection
          description="A despesa selecionada preenche o item e o valor da nota."
          title="Lançamento vinculado"
        >
          <div className="grid gap-3">
            <FeatureSearchField
              aria-label="Buscar lançamento"
              disabled={disabled}
              label="Buscar lançamento"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nome ou categoria"
              value={query}
            />
            {entriesStatus === "loading" ? (
              <FeatureLoadingState>Carregando lançamentos</FeatureLoadingState>
            ) : null}
            {entriesStatus === "error" ? (
              <FeatureAlert>
                Não foi possível carregar os lançamentos financeiros. Nenhuma
                emissão foi iniciada.
              </FeatureAlert>
            ) : null}
            {entriesStatus === "ready" && entryResults.length === 0 ? (
              <p className="text-sm font-semibold text-muted">
                Nenhuma despesa encontrada para esta busca.
              </p>
            ) : null}
            <ul className="grid gap-2">
              {entryResults.map((entry) => {
                const view = describeEntryForSearch(entry);
                const active = draft.entryId === entry.id;
                return (
                  <li key={entry.id}>
                    <button
                      aria-pressed={active}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-app px-3 py-2 text-left outline-none focus:shadow-[var(--shadow-focus)]"
                      disabled={disabled}
                      onClick={() => onSelectEntry(entry)}
                      type="button"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-app-text">
                          {view.label}
                        </span>
                        <span className="block truncate text-xs font-semibold text-muted">
                          {view.detail}
                        </span>
                      </span>
                      {active ? (
                        <FeatureStatusBadge tone="success">
                          Selecionado
                        </FeatureStatusBadge>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
            {selectedEntry ? (
              <p className="text-xs font-semibold text-muted">
                Referência externa: entry:{selectedEntry.id}
              </p>
            ) : null}
          </div>
        </FeatureFormSection>
      ) : null}

      {draft.origin === "standalone" ? (
        <FeatureFormSection
          description="Emissão sem vínculo com venda ou lançamento. A referência identifica a operação no provedor fiscal."
          title="Emissão avulsa"
        >
          <FeatureField label="Referência externa">
            <FeatureInput
              aria-label="Referência externa"
              disabled={disabled}
              onChange={(event) =>
                onChange({ externalReference: event.target.value })
              }
              placeholder="Ex.: avulsa-2026-001"
              value={draft.externalReference}
            />
          </FeatureField>
        </FeatureFormSection>
      ) : null}
    </>
  );
}
