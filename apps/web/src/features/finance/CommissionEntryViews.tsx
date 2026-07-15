import { Pencil, XCircle } from "lucide-react";
import { entryDescription, entryReference } from "./commissionEntryMeta";
import { CommissionIconAction } from "./CommissionSellerParts";
import { formatCurrency, formatDate } from "./financeBillsFormat";
import { FinanceBadge, financeStatusLabels } from "./FinanceFormParts";
import type { FinanceEntry } from "./types";

type CommissionEntryViewProps = {
  canUpdate: boolean;
  entry: FinanceEntry;
  onCancel: (entry: FinanceEntry) => void;
  onEdit: (entry: FinanceEntry) => void;
};

export function CommissionRow({
  canUpdate,
  entry,
  onCancel,
  onEdit,
}: CommissionEntryViewProps) {
  return (
    <tr className="align-top">
      <td className="px-4 py-3">
        <strong className="block text-app-text">{entry.name}</strong>
        {entryDescription(entry) ? (
          <span className="text-xs font-bold text-muted">
            {entryDescription(entry)}
          </span>
        ) : null}
      </td>
      <td className="px-4 py-3 font-bold text-muted">
        {entryReference(entry)}
      </td>
      <td className="px-4 py-3 font-bold text-muted">
        {formatDate(entry.dueAt)}
      </td>
      <td className="px-4 py-3">
        <FinanceBadge>{financeStatusLabels[entry.status]}</FinanceBadge>
      </td>
      <td className="px-4 py-3 text-right font-black text-app-text whitespace-nowrap">
        {formatCurrency(entry.amountCents)}
      </td>
      <td className="px-4 py-3">
        {canUpdate ? (
          <CommissionActions
            entry={entry}
            onCancel={onCancel}
            onEdit={onEdit}
          />
        ) : null}
      </td>
    </tr>
  );
}

export function CommissionMobileCard({
  canUpdate,
  entry,
  onCancel,
  onEdit,
}: CommissionEntryViewProps) {
  return (
    <article
      aria-label={`Comissão ${entry.name}`}
      className="rounded-lg border border-line bg-panel p-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <strong className="block break-words text-sm font-black text-app-text">
            {entry.name}
          </strong>
          <span className="mt-1 block text-xs font-bold text-muted">
            {entryReference(entry)} · {formatDate(entry.dueAt)}
          </span>
        </div>
        <strong className="shrink-0 whitespace-nowrap text-sm font-black text-app-text">
          {formatCurrency(entry.amountCents)}
        </strong>
      </div>
      {entryDescription(entry) ? (
        <p className="mt-2 break-words text-xs font-bold text-muted">
          {entryDescription(entry)}
        </p>
      ) : null}
      <div className="mt-3 flex items-center justify-between gap-3">
        <FinanceBadge>{financeStatusLabels[entry.status]}</FinanceBadge>
        {canUpdate ? (
          <CommissionActions
            entry={entry}
            onCancel={onCancel}
            onEdit={onEdit}
          />
        ) : (
          <span className="text-xs font-black uppercase text-muted">
            Somente leitura
          </span>
        )}
      </div>
    </article>
  );
}

function CommissionActions({
  entry,
  onCancel,
  onEdit,
}: Omit<CommissionEntryViewProps, "canUpdate">) {
  return (
    <div className="flex justify-end gap-2">
      <CommissionIconAction
        icon={<Pencil aria-hidden="true" className="size-4" />}
        label="Editar comissão"
        onClick={() => onEdit(entry)}
        variant="edit"
      />
      <CommissionIconAction
        disabled={entry.status === "cancelled"}
        icon={<XCircle aria-hidden="true" className="size-4" />}
        label="Cancelar comissão"
        onClick={() => onCancel(entry)}
        variant="delete"
      />
    </div>
  );
}
