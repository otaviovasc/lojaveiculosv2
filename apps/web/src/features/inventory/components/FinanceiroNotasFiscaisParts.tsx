import type { FormEvent } from "react";
import { Edit, FileSpreadsheet, Plus, Save, Trash2 } from "lucide-react";
import {
  FeatureInput,
  FeatureSelect,
} from "../../../components/ui/FeatureControls";

export type InvoiceType = "entrada" | "saida";
export type InvoiceStatus = "issued" | "cancelled" | "draft" | "failed";

export type Invoice = {
  id: string;
  number: string;
  type: InvoiceType;
  value: number;
  date: string;
  status: InvoiceStatus;
};

const invoiceTypeOptions: ReadonlyArray<{
  label: string;
  value: InvoiceType;
}> = [
  { label: "Entrada", value: "entrada" },
  { label: "Saída", value: "saida" },
];

const invoiceStatusOptions: ReadonlyArray<{
  label: string;
  value: InvoiceStatus;
}> = [
  { label: "Emitida", value: "issued" },
  { label: "Cancelada", value: "cancelled" },
  { label: "Rascunho", value: "draft" },
  { label: "Falhou", value: "failed" },
];

export function InvoiceForm({
  editingInvoiceId,
  invoiceDate,
  invoiceNumber,
  invoiceStatus,
  invoiceType,
  invoiceValue,
  onCancel,
  onDateChange,
  onNumberChange,
  onSave,
  onStatusChange,
  onTypeChange,
  onValueChange,
}: {
  editingInvoiceId: string | null;
  invoiceDate: string;
  invoiceNumber: string;
  invoiceStatus: InvoiceStatus;
  invoiceType: InvoiceType;
  invoiceValue: string;
  onCancel: () => void;
  onDateChange: (value: string) => void;
  onNumberChange: (value: string) => void;
  onSave: (event: FormEvent) => void;
  onStatusChange: (value: InvoiceStatus) => void;
  onTypeChange: (value: InvoiceType) => void;
  onValueChange: (value: string) => void;
}) {
  return (
    <form
      className="grid gap-4 rounded-xl border border-line/60 bg-app/20 p-4"
      onSubmit={onSave}
    >
      <h4 className="text-xs font-black uppercase tracking-wider text-app-text">
        {editingInvoiceId ? "Editar Nota Fiscal" : "Nova Nota Fiscal"}
      </h4>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-5">
        <label className="grid gap-1.5 text-xs font-black text-app-text">
          <span>Número da Nota</span>
          <FeatureInput
            className="min-h-9 text-xs"
            onChange={(event) => onNumberChange(event.target.value)}
            placeholder="Ex: NFe-000104"
            required
            type="text"
            value={invoiceNumber}
          />
        </label>

        <label className="grid gap-1.5 text-xs font-black text-app-text">
          <span>Tipo</span>
          <FeatureSelect
            ariaLabel="Tipo da nota fiscal"
            className="min-h-9 text-xs"
            onChange={onTypeChange}
            options={invoiceTypeOptions}
            value={invoiceType}
          />
        </label>

        <label className="grid gap-1.5 text-xs font-black text-app-text">
          <span>Valor (R$)</span>
          <FeatureInput
            className="min-h-9 text-xs"
            onChange={(event) => onValueChange(event.target.value)}
            placeholder="Ex: 145000.00"
            required
            step="0.01"
            type="number"
            value={invoiceValue}
          />
        </label>

        <label className="grid gap-1.5 text-xs font-black text-app-text">
          <span>Data Emissão</span>
          <FeatureInput
            className="min-h-9 text-xs"
            onChange={(event) => onDateChange(event.target.value)}
            placeholder="dd/mm/aaaa"
            required
            type="text"
            value={invoiceDate}
          />
        </label>

        <label className="grid gap-1.5 text-xs font-black text-app-text">
          <span>Status</span>
          <FeatureSelect
            ariaLabel="Status da nota fiscal"
            className="min-h-9 text-xs"
            onChange={onStatusChange}
            options={invoiceStatusOptions}
            value={invoiceStatus}
          />
        </label>
      </div>

      <div className="mt-2 flex justify-end gap-2">
        <button
          className="min-h-9 cursor-pointer rounded-lg border border-line bg-app-elevated px-4 text-xs font-black text-app-text hover:bg-line/25"
          onClick={onCancel}
          type="button"
        >
          Cancelar
        </button>
        <button
          className="flex min-h-9 cursor-pointer items-center gap-1 rounded-lg bg-accent px-4 text-xs font-black text-inverse transition-all hover:bg-accent-strong"
          type="submit"
        >
          <Save className="size-3.5" />
          <span>Salvar</span>
        </button>
      </div>
    </form>
  );
}

export function InvoiceTable({
  formatBRL,
  invoices,
  onDelete,
  onEdit,
}: {
  formatBRL: (cents: number) => string;
  invoices: readonly Invoice[];
  onDelete: (id: string) => void;
  onEdit: (invoice: Invoice) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs font-bold">
        <thead>
          <tr className="border-b border-line text-xs uppercase tracking-wider text-muted">
            <th className="py-2">Nota / Doc</th>
            <th className="py-2">Tipo</th>
            <th className="py-2">Emissão</th>
            <th className="py-2">Status</th>
            <th className="py-2 text-right">Valor</th>
            <th className="py-2 text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr
              className="border-b border-line/30 transition-colors hover:bg-app/10"
              key={invoice.id}
            >
              <td className="flex items-center gap-2 py-3 font-black text-app-text">
                <FileSpreadsheet className="size-4 shrink-0 text-muted animate-none" />
                <span>{invoice.number}</span>
              </td>
              <td className="py-3">
                <span className={invoiceTypeBadgeClass(invoice.type)}>
                  {invoice.type === "entrada" ? "Entrada" : "Saída"}
                </span>
              </td>
              <td className="py-3 text-muted">{invoice.date}</td>
              <td className="py-3">
                <span className="flex items-center gap-1.5">
                  <span className={invoiceStatusDotClass(invoice.status)} />
                  <span className="text-xs capitalize text-muted">
                    {invoiceStatusLabel(invoice.status)}
                  </span>
                </span>
              </td>
              <td className="py-3 text-right font-black text-app-text">
                {formatBRL(invoice.value)}
              </td>
              <td className="py-3 text-right">
                <div className="flex justify-end gap-1.5">
                  <button
                    className="cursor-pointer rounded p-1 text-muted hover:bg-line/20 hover:text-app-text"
                    onClick={() => onEdit(invoice)}
                    title="Editar"
                    type="button"
                  >
                    <Edit className="size-3.5" />
                  </button>
                  <button
                    className="cursor-pointer rounded p-1 text-danger hover:bg-line/20 hover:text-danger-strong"
                    onClick={() => onDelete(invoice.id)}
                    title="Excluir"
                    type="button"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function InvoiceEmptyState({
  isAddingInvoice,
  onAdd,
}: {
  isAddingInvoice: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-line border-dashed bg-app/10 py-12 text-center">
      <FileSpreadsheet className="size-8 text-muted animate-none" />
      <div>
        <p className="text-xs font-black text-app-text">
          Nenhuma Nota Fiscal retornada para este veículo.
        </p>
        <p className="mt-1 text-xs font-bold text-muted">
          A emissão fiscal ainda não está conectada a este detalhe.
        </p>
      </div>
      {!isAddingInvoice && (
        <button
          className="mt-2 flex min-h-8 cursor-pointer items-center gap-1 rounded-lg border border-accent-soft/20 bg-accent-soft px-4 text-xs font-black text-accent-strong hover:bg-accent-soft/85"
          onClick={onAdd}
          type="button"
        >
          <Plus className="size-3.5" />
          <span>Lançar Primeira Nota</span>
        </button>
      )}
    </div>
  );
}

function invoiceTypeBadgeClass(type: InvoiceType) {
  return type === "entrada"
    ? "rounded-full border border-success/20 bg-success/10 px-2.5 py-0.5 text-xs font-black text-success"
    : "rounded-full border border-line bg-blue-soft px-2.5 py-0.5 text-xs font-black text-app-text";
}

function invoiceStatusDotClass(status: InvoiceStatus) {
  if (status === "issued") return "size-1.5 rounded-full bg-success";
  if (status === "cancelled") return "size-1.5 rounded-full bg-danger";
  if (status === "failed") return "size-1.5 rounded-full bg-warning";
  return "size-1.5 rounded-full bg-muted";
}

function invoiceStatusLabel(status: InvoiceStatus) {
  if (status === "issued") return "Emitida";
  if (status === "cancelled") return "Cancelada";
  if (status === "failed") return "Falhou";
  return "Rascunho";
}
