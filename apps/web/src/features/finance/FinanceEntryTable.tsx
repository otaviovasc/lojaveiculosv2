import {
  CheckCircle2,
  FilePenLine,
  FileText,
  Pencil,
  PlusCircle,
  ReceiptText,
  XCircle,
} from "lucide-react";
import {
  FinanceBadge,
  FinancePanel,
  financeStatusLabels,
} from "./FinanceFormParts";
import type { FinanceEntry } from "./types";
import { formatCurrency, formatDate } from "./financeBillsFormat";
import type { ReactNode } from "react";

export function FinanceEntryTable({
  entries,
  isLoading,
  onCancel,
  onCreate,
  onEdit,
  onMarkPending,
  onPay,
}: {
  entries: FinanceEntry[];
  isLoading: boolean;
  onCancel: (entry: FinanceEntry) => void;
  onCreate: () => void;
  onEdit: (entry: FinanceEntry) => void;
  onMarkPending: (entry: FinanceEntry) => void;
  onPay: (entry: FinanceEntry) => void;
}) {
  return (
    <FinancePanel icon={<FileText className="size-5" />} title="Registro de atividades">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-muted">
            {entries.length} lancamentos encontrados
          </p>
        </div>
        <button
          className="flex min-h-10 items-center justify-center gap-2 rounded-lg bg-accent px-3 text-sm font-black text-inverse"
          onClick={onCreate}
          type="button"
        >
          <PlusCircle aria-hidden="true" className="size-4" />
          Novo
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[840px] text-left text-sm">
          <thead className="border-b border-line text-xs font-black uppercase tracking-widest text-muted">
            <tr>
              <th className="py-3 pr-4">Lancamento</th>
              <th className="py-3 pr-4">Categoria</th>
              <th className="py-3 pr-4">Vencimento</th>
              <th className="py-3 pr-4">Status</th>
              <th className="py-3 text-right">Valor</th>
              <th className="py-3 pl-4 text-right">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {entries.map((entry) => (
              <tr className="align-top" key={entry.id}>
                <td className="py-3 pr-4">
                  <strong className="block text-app-text">{entry.name}</strong>
                  <span className="text-xs font-bold text-muted">
                    {entry.sellerUserId ? "Vinculado a vendedor" : "Lancamento geral"}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <FinanceBadge>{entry.category}</FinanceBadge>
                </td>
                <td className="py-3 pr-4 font-bold text-muted">
                  {formatDate(entry.dueAt)}
                </td>
                <td className="py-3 pr-4">
                  <button
                    className="rounded-full bg-accent-soft px-3 py-1 text-xs font-black text-accent-strong disabled:opacity-60"
                    disabled={entry.status === "cancelled"}
                    onClick={() =>
                      entry.status === "paid" ? onMarkPending(entry) : onPay(entry)
                    }
                    type="button"
                  >
                    {financeStatusLabels[entry.status]}
                  </button>
                </td>
                <td className="py-3 text-right font-black text-app-text">
                  {formatCurrency(entry.amountCents)}
                </td>
                <td className="py-3 pl-4">
                  <div className="flex justify-end gap-2">
                    <IconAction
                      icon={<ReceiptText aria-hidden="true" className="size-4" />}
                      label="Anexar recibo"
                      onClick={() => onEdit(entry)}
                    />
                    <IconAction
                      icon={<Pencil aria-hidden="true" className="size-4" />}
                      label="Editar lancamento"
                      onClick={() => onEdit(entry)}
                    />
                    <IconAction
                      disabled={entry.status === "paid"}
                      icon={<CheckCircle2 aria-hidden="true" className="size-4" />}
                      label="Marcar como pago"
                      onClick={() => onPay(entry)}
                    />
                    <IconAction
                      disabled={entry.status === "cancelled"}
                      icon={<XCircle aria-hidden="true" className="size-4" />}
                      label="Cancelar lancamento"
                      onClick={() => onCancel(entry)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!isLoading && entries.length === 0 ? (
        <div className="mt-4 rounded-lg border border-line bg-app p-6 text-center">
          <FilePenLine className="mx-auto size-8 text-muted" />
          <h3 className="mt-3 text-base font-black text-app-text">
            Nenhum lancamento encontrado
          </h3>
          <p className="mt-1 text-sm font-bold text-muted">
            Crie o primeiro gasto, receita ou conta recorrente da loja.
          </p>
        </div>
      ) : null}
      {isLoading ? (
        <p className="mt-4 rounded-lg border border-line bg-app p-4 text-sm font-black text-muted">
          Carregando lancamentos.
        </p>
      ) : null}
    </FinancePanel>
  );
}

function IconAction({
  disabled,
  icon,
  label,
  onClick,
}: {
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="rounded-lg border border-line bg-app p-2 text-accent-strong disabled:text-muted disabled:opacity-60"
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {icon}
    </button>
  );
}
