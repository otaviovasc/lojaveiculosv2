import { FilePenLine, FileText, PlusCircle } from "lucide-react";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import {
  FeatureEmptyState,
  FeatureLoadingState,
} from "../../components/ui/FeatureStates";
import { entrySourceKey, sourceLabel } from "./financeCashFlowModel";
import {
  FinanceBadge,
  FinancePanel,
  financeTypeLabels,
} from "./FinanceFormParts";
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
  onMarkPending,
  onPay,
  otherEntryCount,
}: {
  activeType: FinanceEntry["type"];
  canAttach?: boolean;
  canCreate?: boolean;
  canUpdate?: boolean;
  entries: FinanceEntry[];
  isLoading: boolean;
  onCancel: (entry: FinanceEntry) => void;
  onCreate: () => void;
  onEdit: (entry: FinanceEntry) => void;
  onMarkPending: (entry: FinanceEntry) => void;
  onPay: (entry: FinanceEntry) => void;
  otherEntryCount: number;
}) {
  const activeLabel = financeTypeLabels[activeType].toLowerCase();
  return (
    <FinancePanel
      actions={
        canCreate ? (
          <FeatureActionButton
            icon={PlusCircle}
            label="Novo"
            onClick={onCreate}
            variant="primary"
          />
        ) : undefined
      }
      icon={<FileText className="size-5" />}
      title={`Registro de ${activeLabel}`}
    >
      <p className="mb-3 text-sm font-bold text-muted">
        A lista mostra apenas {activeLabel}. O fluxo de caixa acima consolida
        gastos, receitas e comissões.
      </p>
      <p className="mb-4 text-xs font-black uppercase tracking-wider text-muted">
        {entries.length} lançamento(s) encontrados
      </p>
      {isLoading ? (
        <FeatureLoadingState icon={FileText} title="Carregando lançamentos">
          <p className="text-sm font-bold text-muted">
            Buscando contas, recibos e status do caixa.
          </p>
        </FeatureLoadingState>
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
    </FinancePanel>
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
