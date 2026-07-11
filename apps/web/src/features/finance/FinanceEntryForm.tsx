import { LoaderCircle, PlusCircle, Upload } from "lucide-react";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";
import type { CreateFinanceEntryFlowInput } from "./apiClient";
import {
  FinanceField,
  FinanceDateField,
  FinanceInput,
  FinancePanel,
  FinanceSelect,
  financeStatusLabels,
  financeTypeLabels,
} from "./FinanceFormParts";
import type { FinanceEntryStatus, FinanceEntryType } from "./types";

export type FinanceFormState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; entryId: string }
  | { kind: "error"; message: string };

const statuses: FinanceEntryStatus[] = ["pending", "paid", "cancelled"];

export function FinanceEntryForm({
  activeType,
  onSubmit,
  state,
}: {
  activeType: FinanceEntryType;
  onSubmit: (input: CreateFinanceEntryFlowInput) => Promise<void>;
  state: FinanceFormState;
}) {
  const [form, setForm] = useState(() => createInitialForm(activeType));
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    setForm(createInitialForm(activeType));
    setFile(null);
  }, [activeType]);

  const setField =
    (field: keyof FinanceDraft) =>
    (value: ChangeEvent<HTMLInputElement> | string) => {
      setForm((current) => ({
        ...current,
        [field]: typeof value === "string" ? value : value.target.value,
      }));
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const documentTitle = form.documentTitle.trim() || file?.name;

    await onSubmit({
      amountCents: Math.round(Number(form.amount) * 100),
      category: form.category.trim(),
      documentFile: file,
      documentKind: form.documentKind.trim() || "finance_receipt",
      ...(documentTitle ? { documentTitle } : {}),
      dueAt: form.dueAt
        ? new Date(`${form.dueAt}T12:00:00`).toISOString()
        : null,
      links: [],
      metadata: {
        notes: form.notes.trim(),
      },
      name: form.name.trim(),
      paidAt:
        form.status === "paid"
          ? new Date(`${form.paidAt || form.dueAt}T12:00:00`).toISOString()
          : null,
      sellerUserId: form.sellerUserId.trim() || null,
      status: form.status,
      type: activeType,
    });
  };

  return (
    <FinancePanel
      icon={<PlusCircle className="size-5" />}
      title="Novo lancamento"
    >
      <form
        className="grid gap-4"
        onSubmit={(event) => void handleSubmit(event)}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FinanceField label="Descricao">
            <FinanceInput
              onChange={setField("name")}
              placeholder={`${financeTypeLabels[activeType]} do mes`}
              required
              value={form.name}
            />
          </FinanceField>
          <FinanceField label="Categoria">
            <FinanceInput
              onChange={setField("category")}
              placeholder="Operacional"
              required
              value={form.category}
            />
          </FinanceField>
          <FinanceField label="Valor">
            <FinanceInput
              min="0"
              onChange={setField("amount")}
              required
              step="0.01"
              type="number"
              value={form.amount}
            />
          </FinanceField>
          <FinanceField label="Status">
            <FinanceSelect
              onChange={setField("status")}
              options={statuses.map((status) => ({
                label: financeStatusLabels[status],
                value: status,
              }))}
              value={form.status}
            />
          </FinanceField>
          <FinanceField label="Vencimento">
            <FinanceDateField
              label="Vencimento"
              onChange={setField("dueAt")}
              value={form.dueAt}
            />
          </FinanceField>
          <FinanceField label="Pagamento">
            <FinanceDateField
              disabled={form.status !== "paid"}
              label="Pagamento"
              onChange={setField("paidAt")}
              value={form.paidAt}
            />
          </FinanceField>
          <FinanceField label="Vendedor" hint="Opcional para comissoes.">
            <FinanceInput
              onChange={setField("sellerUserId")}
              placeholder="Nome ou usuario responsavel"
              value={form.sellerUserId}
            />
          </FinanceField>
          <FinanceField label="Observacao">
            <FinanceInput
              onChange={setField("notes")}
              placeholder="Origem, contrato ou referencia"
              value={form.notes}
            />
          </FinanceField>
        </div>

        <div className="rounded-lg border border-line bg-app p-3">
          <div className="mb-3 flex items-center gap-2 text-sm font-black text-app-text">
            <Upload aria-hidden="true" className="size-4 text-accent-strong" />
            Anexo opcional
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FinanceField label="Arquivo">
              <FinanceInput
                accept="image/*,application/pdf"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                type="file"
              />
            </FinanceField>
            <FinanceField label="Titulo do documento">
              <FinanceInput
                disabled={!file}
                onChange={setField("documentTitle")}
                placeholder={file?.name ?? "Recibo"}
                value={form.documentTitle}
              />
            </FinanceField>
          </div>
        </div>

        <button
          className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-black text-inverse disabled:opacity-70"
          disabled={state.kind === "submitting"}
          type="submit"
        >
          {state.kind === "submitting" ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <PlusCircle aria-hidden="true" className="size-4" />
          )}
          Salvar lancamento
        </button>

        {state.kind === "error" ? (
          <p className="rounded-lg border border-line bg-app p-3 text-sm font-black text-danger">
            {state.message}
          </p>
        ) : null}
        {state.kind === "success" ? (
          <p className="rounded-lg border border-line bg-accent-soft p-3 text-sm font-black text-accent-strong">
            Lancamento salvo: {state.entryId}
          </p>
        ) : null}
      </form>
    </FinancePanel>
  );
}

type FinanceDraft = {
  amount: string;
  category: string;
  documentKind: string;
  documentTitle: string;
  dueAt: string;
  name: string;
  notes: string;
  paidAt: string;
  sellerUserId: string;
  status: FinanceEntryStatus;
  type: FinanceEntryType;
};

function createInitialForm(type: FinanceEntryType): FinanceDraft {
  return {
    amount: "",
    category: type === "commission" ? "Comissao" : "",
    documentKind: "finance_receipt",
    documentTitle: "",
    dueAt: "",
    name: "",
    notes: "",
    paidAt: "",
    sellerUserId: "",
    status: "pending",
    type,
  };
}
