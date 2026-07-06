import { useState, type FormEvent } from "react";
import {
  InvoiceEmptyState,
  InvoiceForm,
  InvoiceTable,
  type Invoice,
  type InvoiceStatus,
  type InvoiceType,
} from "./FinanceiroNotasFiscaisParts";
import { Plus } from "lucide-react";

const initialInvoices: Invoice[] = [
  {
    date: "16/06/2026",
    id: "inv-1",
    number: "NFe-001054",
    status: "issued",
    type: "entrada",
    value: 14500000,
  },
];

export function FinanceiroNotasFiscaisSection({
  formatBRL,
}: {
  formatBRL: (cents: number) => string;
}) {
  const [invoices, setInvoices] = useState<Invoice[]>(() => initialInvoices);
  const [isAddingInvoice, setIsAddingInvoice] = useState(false);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceType, setInvoiceType] = useState<InvoiceType>("entrada");
  const [invoiceValue, setInvoiceValue] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatus>("issued");

  const handleOpenAddInvoice = () => {
    setInvoiceNumber("");
    setInvoiceType("entrada");
    setInvoiceValue("");
    setInvoiceDate(new Date().toLocaleDateString("pt-BR"));
    setInvoiceStatus("issued");
    setEditingInvoiceId(null);
    setIsAddingInvoice(true);
  };

  const handleOpenEditInvoice = (invoice: Invoice) => {
    setInvoiceNumber(invoice.number);
    setInvoiceType(invoice.type);
    setInvoiceValue((invoice.value / 100).toString());
    setInvoiceDate(invoice.date);
    setInvoiceStatus(invoice.status);
    setEditingInvoiceId(invoice.id);
    setIsAddingInvoice(true);
  };

  const handleSaveInvoice = (event: FormEvent) => {
    event.preventDefault();
    const parsedValue =
      Number.parseFloat(invoiceValue.replace(/[^0-9.-]+/g, "")) * 100;
    if (Number.isNaN(parsedValue) || !invoiceNumber) return;

    const nextInvoice = {
      date: invoiceDate,
      number: invoiceNumber,
      status: invoiceStatus,
      type: invoiceType,
      value: parsedValue,
    };

    if (editingInvoiceId) {
      setInvoices((current) =>
        current.map((invoice) =>
          invoice.id === editingInvoiceId
            ? { ...invoice, ...nextInvoice }
            : invoice,
        ),
      );
    } else {
      setInvoices((current) => [
        ...current,
        { ...nextInvoice, id: `inv-${Date.now()}` },
      ]);
    }

    setIsAddingInvoice(false);
    setEditingInvoiceId(null);
  };

  const handleDeleteInvoice = (id: string) => {
    setInvoices((current) => current.filter((invoice) => invoice.id !== id));
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line bg-panel p-5">
      <div className="flex items-center justify-between border-b border-line pb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-black uppercase tracking-wider">
            Notas Fiscais
          </h3>
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-black text-accent-strong">
            {invoices.length}
          </span>
        </div>

        {!isAddingInvoice && (
          <button
            className="flex min-h-8 cursor-pointer items-center gap-1 rounded-lg bg-accent px-3.5 text-xs font-black text-inverse transition-all hover:bg-accent-strong"
            onClick={handleOpenAddInvoice}
            type="button"
          >
            <Plus className="size-3.5" />
            <span>Lançar Nota Fiscal</span>
          </button>
        )}
      </div>

      {isAddingInvoice ? (
        <InvoiceForm
          editingInvoiceId={editingInvoiceId}
          invoiceDate={invoiceDate}
          invoiceNumber={invoiceNumber}
          invoiceStatus={invoiceStatus}
          invoiceType={invoiceType}
          invoiceValue={invoiceValue}
          onCancel={() => setIsAddingInvoice(false)}
          onDateChange={setInvoiceDate}
          onNumberChange={setInvoiceNumber}
          onSave={handleSaveInvoice}
          onStatusChange={setInvoiceStatus}
          onTypeChange={setInvoiceType}
          onValueChange={setInvoiceValue}
        />
      ) : null}

      {invoices.length > 0 ? (
        <InvoiceTable
          formatBRL={formatBRL}
          invoices={invoices}
          onDelete={handleDeleteInvoice}
          onEdit={handleOpenEditInvoice}
        />
      ) : (
        <InvoiceEmptyState
          isAddingInvoice={isAddingInvoice}
          onAdd={handleOpenAddInvoice}
        />
      )}
    </div>
  );
}
