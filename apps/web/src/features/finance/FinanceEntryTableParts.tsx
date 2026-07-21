import { Check, Pencil, ReceiptText, XCircle } from "lucide-react";
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
import { formatCurrency } from "./financeBillsFormat";
import type { FinanceEntry } from "./types";

export function EntryTitle({ entry }: { entry: FinanceEntry }) {
  const description = entryDescription(entry);
  return (
    <div className="min-w-0">
      <strong className="block text-sm font-black text-app-text finance-entry-title__name">
        {entry.name}
      </strong>
      <span className="mt-1 block truncate text-xs font-bold text-muted">
        {entrySellerName(entry)}
      </span>
      {description ? (
        <span className="mt-1 block max-w-md text-xs font-bold text-muted finance-entry-title__desc">
          {description}
        </span>
      ) : null}
      <ReceiptMarker metadata={entry.metadata} />
    </div>
  );
}

export function StatusButton({
  canUpdate = false,
  entry,
  onToggle,
}: {
  canUpdate?: boolean;
  entry: FinanceEntry;
  onToggle?: (entry: FinanceEntry) => void;
}) {
  const toggleable =
    canUpdate && onToggle !== undefined && entry.status !== "cancelled";
  if (!toggleable) {
    return (
      <FeatureStatusBadge tone={statusTone(entry.status)}>
        {financeStatusLabels[entry.status]}
      </FeatureStatusBadge>
    );
  }
  const pending = entry.status !== "paid";
  if (pending) {
    return (
      <button
        aria-label={`Marcar ${entry.name} como pago`}
        className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-line bg-panel px-3 text-xs font-black text-app-text transition-all hover:border-success-strong hover:text-success-strong focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)] active:scale-95"
        onClick={() => onToggle(entry)}
        title="Confirmar pagamento"
        type="button"
      >
        <Check aria-hidden="true" className="size-3.5 shrink-0" />
        <span>Pagar</span>
        <FeatureStatusBadge size="dense" tone={statusTone(entry.status)}>
          {financeStatusLabels[entry.status]}
        </FeatureStatusBadge>
      </button>
    );
  }
  return (
    <button
      aria-label="Marcar como pendente"
      className="cursor-pointer rounded-full transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus)] active:scale-95"
      onClick={() => onToggle(entry)}
      title="Marcar como pendente"
      type="button"
    >
      <FeatureStatusBadge tone={statusTone(entry.status)}>
        {financeStatusLabels[entry.status]}
      </FeatureStatusBadge>
    </button>
  );
}

export function EntryActions({
  canAttach = true,
  canUpdate = true,
  entry,
  onCancel,
  onEdit,
}: {
  canAttach?: boolean;
  canUpdate?: boolean;
  entry: FinanceEntry;
  onCancel: (entry: FinanceEntry) => void;
  onEdit: (entry: FinanceEntry) => void;
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
      className="finance-mobile-action inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-panel px-3 text-xs font-black text-accent-strong disabled:text-muted disabled:opacity-60"
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
