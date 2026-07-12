import { FilePenLine, FileText, PlusCircle } from "lucide-react";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import { FeatureTableFrame } from "../../components/ui/FeatureTable";
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
import { formatDate } from "./financeBillsFormat";
import {
  EntryActions,
  EntryTitle,
  MobileAction,
  StatusButton,
  amountLabel,
} from "./FinanceEntryTableParts";
import type { FinanceEntry } from "./types";

export function FinanceEntryTable({
  activeType,
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
        <FeatureActionButton
          icon={PlusCircle}
          label="Novo"
          onClick={onCreate}
          variant="primary"
        />
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
            <FeatureActionButton
              icon={PlusCircle}
              label="Criar lançamento"
              onClick={onCreate}
              variant="primary"
            />
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
          <DesktopTable
            entries={entries}
            onCancel={onCancel}
            onEdit={onEdit}
            onMarkPending={onMarkPending}
            onPay={onPay}
          />
          <div className="grid gap-3 md:hidden" aria-label="Lançamentos móveis">
            {entries.map((entry) => (
              <FinanceEntryCard
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

function DesktopTable({
  entries,
  onCancel,
  onEdit,
  onMarkPending,
  onPay,
}: {
  entries: FinanceEntry[];
  onCancel: (entry: FinanceEntry) => void;
  onEdit: (entry: FinanceEntry) => void;
  onMarkPending: (entry: FinanceEntry) => void;
  onPay: (entry: FinanceEntry) => void;
}) {
  return (
    <FeatureTableFrame className="hidden md:block">
      <table className="w-full min-w-[920px] text-left text-sm">
        <thead className="border-b border-line text-xs font-black uppercase tracking-wider text-muted">
          <tr>
            <th className="px-4 py-3">Lançamento</th>
            <th className="px-4 py-3">Origem</th>
            <th className="px-4 py-3">Vencimento</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3 text-right">Valor</th>
            <th className="px-4 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {entries.map((entry) => (
            <tr
              className="align-top transition-colors hover:bg-app finance-table-row"
              key={entry.id}
            >
              <td className="px-4 py-3">
                <EntryTitle entry={entry} />
              </td>
              <td className="px-4 py-3">
                <FinanceBadge className="finance-source-badge">
                  {sourceLabel(entrySourceKey(entry))}
                </FinanceBadge>
              </td>
              <td className="px-4 py-3 font-bold text-muted">
                {formatDate(entry.dueAt)}
              </td>
              <td className="px-4 py-3">
                <StatusButton
                  entry={entry}
                  onMarkPending={onMarkPending}
                  onPay={onPay}
                />
              </td>
              <td
                className="px-4 py-3 text-right font-black text-app-text finance-cell-amount"
                data-entry-type={entry.type}
              >
                {amountLabel(entry)}
              </td>
              <td className="px-4 py-3">
                <EntryActions
                  entry={entry}
                  onCancel={onCancel}
                  onEdit={onEdit}
                  onPay={onPay}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </FeatureTableFrame>
  );
}

function FinanceEntryCard({
  entry,
  onCancel,
  onEdit,
  onMarkPending,
  onPay,
}: {
  entry: FinanceEntry;
  onCancel: (entry: FinanceEntry) => void;
  onEdit: (entry: FinanceEntry) => void;
  onMarkPending: (entry: FinanceEntry) => void;
  onPay: (entry: FinanceEntry) => void;
}) {
  return (
    <article
      aria-label={`Lançamento ${entry.name}`}
      className="rounded-lg border border-line bg-app p-4 shadow-sm finance-entry-card"
      data-entry-type={entry.type}
    >
      <div className="flex items-start justify-between gap-3">
        <EntryTitle entry={entry} />
        <strong className="shrink-0 text-sm font-black text-app-text finance-card-amount">
          {amountLabel(entry)}
        </strong>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <StatusButton
          entry={entry}
          onMarkPending={onMarkPending}
          onPay={onPay}
        />
        <FinanceBadge className="finance-source-badge">
          {sourceLabel(entrySourceKey(entry))}
        </FinanceBadge>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <MobileAction label="Editar" onClick={() => onEdit(entry)} />
        <MobileAction
          disabled={entry.status === "paid"}
          label="Pagar"
          onClick={() => onPay(entry)}
        />
        <MobileAction
          disabled={entry.status === "cancelled"}
          label="Cancelar"
          onClick={() => onCancel(entry)}
        />
      </div>
    </article>
  );
}
