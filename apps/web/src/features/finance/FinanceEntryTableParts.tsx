import {
  CheckCircle2,
  Pencil,
  ReceiptText,
  RotateCcw,
  XCircle,
} from "lucide-react";
import {
  FeatureRowAction,
  FeatureRowActions,
} from "../../components/ui/FeatureTable";
import {
  FeatureStatusBadge,
  type FeatureStatusTone,
} from "../../components/ui/FeatureStates";
import { entryDescription, entrySellerName } from "./commissionEntryMeta";
import { financeStatusLabels } from "./FinanceFormParts";
import { formatCurrency, formatFinanceCategory } from "./financeBillsFormat";
import type { FinanceEntry } from "./types";

export function EntryTitle({ entry }: { entry: FinanceEntry }) {
  const description = entryDescription(entry);
  return (
    <div className="min-w-0">
      <strong className="block break-words text-sm font-black text-app-text">
        {entry.name}
      </strong>
      <span className="mt-1 block break-words text-xs font-bold text-muted">
        {formatFinanceCategory(entry.category)} · {entrySellerName(entry)}
      </span>
      {description ? (
        <span className="mt-1 block max-w-md truncate text-xs font-bold text-muted">
          {description}
        </span>
      ) : null}
      <ReceiptMarker metadata={entry.metadata} />
    </div>
  );
}

export function StatusButton({ entry }: { entry: FinanceEntry }) {
  return (
    <FeatureStatusBadge tone={statusTone(entry.status)}>
      {financeStatusLabels[entry.status]}
    </FeatureStatusBadge>
  );
}

export function EntryActions({
  canAttach = true,
  canUpdate = true,
  entry,
  onCancel,
  onEdit,
  onMarkPending,
  onPay,
}: {
  canAttach?: boolean;
  canUpdate?: boolean;
  entry: FinanceEntry;
  onCancel: (entry: FinanceEntry) => void;
  onEdit: (entry: FinanceEntry) => void;
  onMarkPending: (entry: FinanceEntry) => void;
  onPay: (entry: FinanceEntry) => void;
}) {
  if (!canAttach && !canUpdate) return null;
  return (
    <FeatureRowActions>
      {canAttach ? (
        <FeatureRowAction
          ariaLabel="Anexar recibo"
          icon={ReceiptText}
          onClick={() => onEdit(entry)}
          tooltip="Recibo"
        />
      ) : null}
      {canUpdate ? (
        <>
          <FeatureRowAction
            ariaLabel="Editar lançamento"
            icon={Pencil}
            onClick={() => onEdit(entry)}
            tooltip="Editar"
          />
          <FeatureRowAction
            ariaLabel={
              entry.status === "paid"
                ? "Marcar como pendente"
                : "Marcar como pago"
            }
            disabled={entry.status === "cancelled"}
            icon={entry.status === "paid" ? RotateCcw : CheckCircle2}
            onClick={() =>
              entry.status === "paid" ? onMarkPending(entry) : onPay(entry)
            }
            tooltip={entry.status === "paid" ? "Marcar pendente" : "Pagar"}
          />
          <FeatureRowAction
            ariaLabel="Cancelar lançamento"
            disabled={entry.status === "cancelled"}
            icon={XCircle}
            onClick={() => onCancel(entry)}
            tooltip="Cancelar"
          />
        </>
      ) : null}
    </FeatureRowActions>
  );
}

export function MobileAction({
  disabled,
  label,
  onClick,
}: {
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex min-h-10 items-center justify-center rounded-lg border border-line bg-panel px-3 text-xs font-black text-accent-strong disabled:text-muted disabled:opacity-60"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

export function amountLabel(entry: FinanceEntry) {
  const prefix = entry.type === "revenue" ? "+ " : "- ";
  return `${prefix}${formatCurrency(entry.amountCents)}`;
}

function ReceiptMarker({ metadata }: { metadata: FinanceEntry["metadata"] }) {
  const label = receiptLabel(metadata);
  if (!label) return null;
  return (
    <span className="mt-2 inline-flex max-w-full items-center gap-1 rounded-full border border-line bg-accent-soft px-2 py-1 text-xs font-black text-accent-strong">
      <ReceiptText aria-hidden="true" className="size-3 shrink-0" />
      <span className="min-w-0 truncate">Comprovante: {label}</span>
    </span>
  );
}

function statusTone(status: FinanceEntry["status"]): FeatureStatusTone {
  if (status === "paid") return "success";
  if (status === "cancelled") return "danger";
  return "warning";
}

function receiptLabel(metadata?: Record<string, unknown>) {
  const receipt = metadata?.receipt;
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) {
    return null;
  }
  const record = receipt as Record<string, unknown>;
  if (typeof record.title === "string" && record.title.trim()) {
    return record.title;
  }
  if (typeof record.fileName === "string" && record.fileName.trim()) {
    return record.fileName;
  }
  return null;
}
