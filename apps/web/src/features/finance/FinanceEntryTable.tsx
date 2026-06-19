import { CheckCircle2, FileText, Pencil, XCircle } from "lucide-react";
import {
  FinanceBadge,
  FinancePanel,
  financeStatusLabels,
} from "./FinanceFormParts";
import type { FinanceEntry, FinanceEntryType } from "./types";

export function FinanceEntryTable({
  entries,
  isLoading,
  type,
  onCancel,
  onEdit,
  onPay,
}: {
  entries: FinanceEntry[];
  isLoading: boolean;
  onCancel: (entry: FinanceEntry) => void;
  onEdit: (entry: FinanceEntry) => void;
  onPay: (entry: FinanceEntry) => void;
  type: FinanceEntryType;
}) {
  const totals = summarizeEntries(entries);

  return (
    <FinancePanel icon={<FileText className="size-5" />} title="Lancamentos">
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <SummaryCard label="Total" value={formatCurrency(totals.totalCents)} />
        <SummaryCard label="Pago" value={formatCurrency(totals.paidCents)} />
        <SummaryCard
          label="Pendente"
          value={formatCurrency(totals.pendingCents)}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line text-xs font-black uppercase tracking-widest text-muted">
            <tr>
              <th className="py-3 pr-4">Descricao</th>
              <th className="py-3 pr-4">Categoria</th>
              <th className="py-3 pr-4">Status</th>
              <th className="py-3 pr-4">Vencimento</th>
              <th className="py-3 text-right">Valor</th>
              <th className="py-3 pl-4 text-right">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td className="py-3 pr-4">
                  <strong className="block text-app-text">{entry.name}</strong>
                  <span className="text-xs font-bold text-muted">
                    {entry.id}
                  </span>
                </td>
                <td className="py-3 pr-4 font-bold text-app-text">
                  {entry.category}
                </td>
                <td className="py-3 pr-4">
                  <FinanceBadge>
                    {financeStatusLabels[entry.status]}
                  </FinanceBadge>
                </td>
                <td className="py-3 pr-4 font-bold text-muted">
                  {entry.dueAt ? formatDate(entry.dueAt) : "Sem vencimento"}
                </td>
                <td className="py-3 text-right font-black text-app-text">
                  {formatCurrency(entry.amountCents)}
                </td>
                <td className="py-3 pl-4">
                  <div className="flex justify-end gap-2">
                    <button
                      className="rounded-lg border border-line bg-app p-2 text-accent-strong"
                      onClick={() => onEdit(entry)}
                      title="Editar"
                      type="button"
                    >
                      <Pencil aria-hidden="true" className="size-4" />
                    </button>
                    <button
                      className="rounded-lg border border-line bg-app p-2 text-success"
                      disabled={entry.status === "paid"}
                      onClick={() => onPay(entry)}
                      title="Marcar como pago"
                      type="button"
                    >
                      <CheckCircle2 aria-hidden="true" className="size-4" />
                    </button>
                    <button
                      className="rounded-lg border border-line bg-app p-2 text-danger"
                      disabled={entry.status === "cancelled"}
                      onClick={() => onCancel(entry)}
                      title="Cancelar"
                      type="button"
                    >
                      <XCircle aria-hidden="true" className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!isLoading && entries.length === 0 ? (
        <p className="mt-4 rounded-lg border border-line bg-app p-4 text-sm font-black text-muted">
          Nenhum lancamento de {type} encontrado.
        </p>
      ) : null}
      {isLoading ? (
        <p className="mt-4 rounded-lg border border-line bg-app p-4 text-sm font-black text-muted">
          Carregando lancamentos.
        </p>
      ) : null}
    </FinancePanel>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-app p-3">
      <p className="text-xs font-black uppercase tracking-widest text-muted">
        {label}
      </p>
      <p className="mt-1 text-lg font-black text-app-text">{value}</p>
    </div>
  );
}

function summarizeEntries(entries: FinanceEntry[]) {
  return entries.reduce(
    (summary, entry) => ({
      paidCents:
        summary.paidCents + (entry.status === "paid" ? entry.amountCents : 0),
      pendingCents:
        summary.pendingCents +
        (entry.status === "pending" ? entry.amountCents : 0),
      totalCents: summary.totalCents + entry.amountCents,
    }),
    { paidCents: 0, pendingCents: 0, totalCents: 0 },
  );
}

function formatCurrency(valueCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    style: "currency",
  }).format(valueCents / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(
    new Date(value),
  );
}
