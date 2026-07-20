import { Download, FilePenLine, FileText, PlusCircle } from "lucide-react";
import type { ReactNode } from "react";
import {
  FeatureActionButton,
  FeatureSection,
} from "../../components/ui/FeatureLayout";
import { FeatureEmptyState } from "../../components/ui/FeatureStates";
import { entrySourceKey, sourceLabel } from "./financeCashFlowModel";
import { FinanceBadge, financeTypeLabels } from "./FinanceFormParts";
import { FinanceEntryDesktopTable } from "./FinanceEntryDesktopTable";
import {
  EntryTitle,
  MobileAction,
  StatusButton,
  amountLabel,
} from "./FinanceEntryTableParts";
import type { FinanceEntry } from "./types";

export function FinanceEntryTable({
  activeType,
  canAttach = true,
  canCreate = true,
  canUpdate = true,
  entries,
  isLoading,
  onCancel,
  onCreate,
  onEdit,
  onExport,
  onMarkPending,
  onPay,
  otherEntryCount,
  toast,
  typeTabs,
  filters,
}: {
  activeType: FinanceEntry["type"] | "all";
  canAttach?: boolean;
  canCreate?: boolean;
  canUpdate?: boolean;
  entries: FinanceEntry[];
  isLoading: boolean;
  onCancel: (entry: FinanceEntry) => void;
  onCreate: () => void;
  onEdit: (entry: FinanceEntry) => void;
  onExport?: () => void;
  onMarkPending: (entry: FinanceEntry) => void;
  onPay: (entry: FinanceEntry) => void;
  otherEntryCount: number;
  toast?: ReactNode;
  typeTabs?: ReactNode;
  filters?: ReactNode;
}) {
  const activeLabel =
    activeType === "all"
      ? "lançamentos"
      : financeTypeLabels[activeType].toLowerCase();
  return (
    <FeatureSection className="finance-ledger" padding="none">
      <div className="finance-ledger__header">
        <div className="finance-ledger__heading">
          <span aria-hidden="true" className="finance-ledger__icon">
            <FileText className="size-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-app-text">
              Registro de {activeLabel}
            </h3>
            <p className="mt-0.5 text-xs font-bold text-muted">
              {entries.length} lançamento(s) encontrado(s)
              {otherEntryCount > 0
                ? ` · mais ${otherEntryCount} em outras abas`
                : ""}
            </p>
          </div>
        </div>
        {typeTabs ? (
          <div className="finance-ledger__tabs">{typeTabs}</div>
        ) : null}
        <div className="finance-ledger__actions">
          {onExport ? (
            <FeatureActionButton
              icon={Download}
              label="Exportar"
              onClick={onExport}
            />
          ) : null}
          {canCreate ? (
            <FeatureActionButton
              icon={PlusCircle}
              label="Novo"
              onClick={onCreate}
              variant="primary"
            />
          ) : null}
        </div>
      </div>
      {toast ? <div className="finance-ledger__toast">{toast}</div> : null}
      <div className="finance-ledger__body">
        {filters}
        {isLoading ? (
          <FinanceEntrySkeleton />
        ) : entries.length === 0 ? (
          <FeatureEmptyState
            action={
              canCreate ? (
                <FeatureActionButton
                  icon={PlusCircle}
                  label="Criar lançamento"
                  onClick={onCreate}
                  variant="primary"
                />
              ) : undefined
            }
            body={
              otherEntryCount > 0
                ? `Nenhum item desta aba corresponde aos filtros. Há ${otherEntryCount} lançamento(s) em outras abas do fluxo consolidado.`
                : "Crie o primeiro gasto, receita ou recorrência para acompanhar o caixa da loja."
            }
            density="compact"
            icon={FilePenLine}
            title="Nenhum lançamento encontrado"
          />
        ) : (
          <>
            <FinanceEntryDesktopTable
              canAttach={canAttach}
              canUpdate={canUpdate}
              entries={entries}
              onCancel={onCancel}
              onEdit={onEdit}
              onMarkPending={onMarkPending}
              onPay={onPay}
            />
            <div
              className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 md:hidden"
              aria-label="Lançamentos móveis"
            >
              {entries.map((entry) => (
                <FinanceEntryCard
                  canAttach={canAttach}
                  canUpdate={canUpdate}
                  entry={entry}
                  key={entry.id}
                  onCancel={onCancel}
                  onEdit={onEdit}
                  onMarkPending={onMarkPending}
                  onPay={onPay}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </FeatureSection>
  );
}

function FinanceEntrySkeleton() {
  return (
    <div aria-busy="true" className="grid gap-2" role="status">
      <span className="sr-only">Carregando lançamentos</span>
      {Array.from({ length: 5 }, (_, index) => (
        <div
          aria-hidden="true"
          className="flex items-center gap-3 rounded-lg border border-line bg-app p-3"
          key={index}
        >
          <div className="grid min-w-0 flex-1 gap-2">
            <div className="h-3 w-2/5 animate-pulse rounded bg-app-elevated" />
            <div className="h-2.5 w-1/4 animate-pulse rounded bg-app-elevated" />
          </div>
          <div className="h-5 w-16 animate-pulse rounded-full bg-app-elevated" />
          <div className="h-4 w-20 animate-pulse rounded bg-app-elevated" />
        </div>
      ))}
    </div>
  );
}

function FinanceEntryCard({
  canAttach,
  canUpdate,
  entry,
  onCancel,
  onEdit,
  onMarkPending,
  onPay,
}: {
  canAttach: boolean;
  canUpdate: boolean;
  entry: FinanceEntry;
  onCancel: (entry: FinanceEntry) => void;
  onEdit: (entry: FinanceEntry) => void;
  onMarkPending: (entry: FinanceEntry) => void;
  onPay: (entry: FinanceEntry) => void;
}) {
  return (
    <article
      aria-label={`Lançamento ${entry.name}`}
      className="min-w-0 rounded-lg border border-line bg-app p-4 shadow-sm finance-entry-card"
      data-entry-type={entry.type}
    >
      <div className="flex items-start justify-between gap-3">
        <EntryTitle entry={entry} />
        <strong className="shrink-0 text-sm font-black text-app-text finance-card-amount">
          {amountLabel(entry)}
        </strong>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <StatusButton entry={entry} />
        <FinanceBadge className="finance-source-badge">
          {sourceLabel(entrySourceKey(entry))}
        </FinanceBadge>
      </div>
      {canAttach || canUpdate ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {canAttach ? (
            <MobileAction label="Recibo" onClick={() => onEdit(entry)} />
          ) : null}
          {canUpdate ? (
            <>
              <MobileAction label="Editar" onClick={() => onEdit(entry)} />
              <MobileAction
                disabled={entry.status === "cancelled"}
                label={entry.status === "paid" ? "Marcar pendente" : "Pagar"}
                onClick={() =>
                  entry.status === "paid" ? onMarkPending(entry) : onPay(entry)
                }
              />
              <MobileAction
                disabled={entry.status === "cancelled"}
                label="Cancelar"
                onClick={() => onCancel(entry)}
              />
            </>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-xs font-black uppercase tracking-wider text-muted">
          Somente leitura
        </p>
      )}
    </article>
  );
}
