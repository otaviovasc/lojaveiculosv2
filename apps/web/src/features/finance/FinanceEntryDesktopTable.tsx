import { FeatureTableFrame } from "../../components/ui/FeatureTable";
import { formatCurrency, formatDate } from "./financeBillsFormat";
import {
  EntryActions,
  EntryTitle,
  StatusButton,
} from "./FinanceEntryTableParts";
import { FinanceCategoryBadge } from "./FinanceCategoryBadge";
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
    <FeatureTableFrame className="hidden md:block finance-table-frame">
      <table className="w-full table-fixed text-left text-sm">
        <colgroup>
          <col style={{ width: "32%" }} />
          <col style={{ width: "18%" }} />
          <col style={{ width: "15%" }} />
          <col style={{ width: "13%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "10%" }} />
        </colgroup>
        <thead className="border-b border-line text-xs font-black uppercase tracking-wider text-muted">
          <tr>
            <th className="pb-3 pt-3 pr-3 pl-0">Lançamento</th>
            <th className="px-3 py-3">Categoria</th>
            <th className="px-3 py-3 text-right">Valor</th>
            <th className="px-3 py-3">Vencimento</th>
            <th className="px-3 py-3">Status</th>
            <th className="pb-3 pt-3 pl-3 pr-0 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {entries.map((entry) => (
            <tr
              className="align-middle transition-colors hover:bg-app finance-table-row"
              key={entry.id}
            >
              <td className="pb-3 pt-3 pr-3 pl-0">
                <EntryTitle entry={entry} />
              </td>
              <td className="px-3 py-3">
                <FinanceCategoryBadge category={entry.category} />
              </td>
              <td
                className="whitespace-nowrap px-3 py-3 text-right font-black text-app-text finance-cell-amount"
                data-entry-type={entry.type}
              >
                {amountLabel(entry)}
              </td>
              <td className="whitespace-nowrap px-3 py-3 font-bold text-muted">
                {formatDate(entry.dueAt)}
              </td>
              <td className="px-3 py-3">
                <StatusButton
                  canUpdate={canUpdate}
                  entry={entry}
                  onToggle={(target) =>
                    target.status === "paid"
                      ? onMarkPending(target)
                      : onPay(target)
                  }
                />
              </td>
              <td className="pb-3 pt-3 pl-3 pr-0">
                <EntryActions
                  canAttach={canAttach}
                  canUpdate={canUpdate}
                  entry={entry}
                  onCancel={onCancel}
                  onEdit={onEdit}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </FeatureTableFrame>
  );
}

function amountLabel(entry: FinanceEntry) {
  const prefix = entry.type === "revenue" ? "+ " : "- ";
  return `${prefix}${formatCurrency(entry.amountCents)}`;
}
