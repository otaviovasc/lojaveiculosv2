import { FeatureTableFrame } from "../../components/ui/FeatureTable";
import { entrySourceKey, sourceLabel } from "./financeCashFlowModel";
import { formatDate } from "./financeBillsFormat";
import { FinanceBadge } from "./FinanceFormParts";
import {
  amountLabel,
  EntryActions,
  EntryTitle,
  StatusButton,
} from "./FinanceEntryTableParts";
import type { FinanceEntry } from "./types";

export function FinanceEntryDesktopTable({
  canAttach,
  canUpdate,
  entries,
  onCancel,
  onEdit,
  onMarkPending,
  onPay,
}: {
  canAttach: boolean;
  canUpdate: boolean;
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
                <StatusButton entry={entry} />
              </td>
              <td
                className="px-4 py-3 text-right font-black text-app-text finance-cell-amount"
                data-entry-type={entry.type}
              >
                {amountLabel(entry)}
              </td>
              <td className="px-4 py-3">
                <EntryActions
                  canAttach={canAttach}
                  canUpdate={canUpdate}
                  entry={entry}
                  onCancel={onCancel}
                  onEdit={onEdit}
                  onMarkPending={onMarkPending}
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
