import { Paperclip, Repeat2 } from "lucide-react";
import type { ChangeEvent } from "react";
import {
  createEntryDraft,
  expenseCategories,
  revenueCategories,
  type FinanceEntryDraft,
} from "./financeBillsModel";
import {
  FinanceField,
  FinanceInput,
  FinanceSelect,
  financeStatusLabels,
  financeTypeLabels,
} from "./FinanceFormParts";
import type { FinanceEntryType } from "./types";

export function StepHeader({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="mb-5 grid grid-cols-3 gap-2">
      {["Tipo", "Recorrencia", "Detalhes"].map((label, index) => (
        <div
          className={[
            "rounded-lg border px-3 py-2 text-center text-xs font-black uppercase",
            step === index + 1
              ? "border-accent bg-accent-soft text-accent-strong"
              : "border-line bg-app text-muted",
          ].join(" ")}
          key={label}
        >
          {label}
        </div>
      ))}
    </div>
  );
}

export function TypeStep({
  draft,
  onChange,
}: {
  draft: FinanceEntryDraft;
  onChange: (draft: FinanceEntryDraft) => void;
}) {
  const types: FinanceEntryType[] = ["expense", "revenue", "commission"];
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {types.map((type) => (
        <button
          className={optionClass(draft.type === type)}
          key={type}
          onClick={() => onChange({ ...createEntryDraft(type), type })}
          type="button"
        >
          <strong className="block text-base font-black">
            {financeTypeLabels[type]}
          </strong>
          <span className="mt-2 block text-sm font-bold text-muted">
            {type === "expense"
              ? "Saidas e contas a pagar"
              : "Entradas da loja"}
          </span>
        </button>
      ))}
    </div>
  );
}

export function RecurrenceStep({
  draft,
  onChange,
}: {
  draft: FinanceEntryDraft;
  onChange: (draft: FinanceEntryDraft) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {(["once", "recurring"] as const).map((recurrence) => (
        <button
          className={optionClass(draft.recurrence === recurrence)}
          key={recurrence}
          onClick={() =>
            onChange({
              ...draft,
              documentFile:
                recurrence === "recurring" ? null : draft.documentFile,
              documentTitle:
                recurrence === "recurring" ? "" : draft.documentTitle,
              recurrence,
            })
          }
          type="button"
        >
          <Repeat2 aria-hidden="true" className="mb-4 size-5" />
          <strong className="block text-base font-black">
            {recurrence === "once" ? "Unico" : "Recorrente"}
          </strong>
          <span className="mt-2 block text-sm font-bold text-muted">
            {recurrence === "once"
              ? "Lancamento pontual"
              : "Mensalidade, aluguel ou parcelamento"}
          </span>
        </button>
      ))}
    </div>
  );
}

export function DetailsStep({
  draft,
  setDraft,
  setField,
}: {
  draft: FinanceEntryDraft;
  setDraft: (draft: FinanceEntryDraft) => void;
  setField: FieldSetter;
}) {
  const categories =
    draft.type === "expense" ? expenseCategories : revenueCategories;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FinanceField label="Identificacao">
        <FinanceInput onChange={setField("name")} required value={draft.name} />
      </FinanceField>
      <FinanceField label="Categoria">
        <FinanceSelect
          onChange={setField("category")}
          options={categories.map((category) => ({
            label: category,
            value: category,
          }))}
          value={draft.category}
        />
      </FinanceField>
      <FinanceField label="Valor">
        <FinanceInput
          min="0"
          onChange={setField("amount")}
          required
          step="0.01"
          type="number"
          value={draft.amount}
        />
      </FinanceField>
      <FinanceField label="Status inicial">
        <FinanceSelect
          onChange={setField("status")}
          options={(["pending", "paid", "cancelled"] as const).map(
            (status) => ({
              label: financeStatusLabels[status],
              value: status,
            }),
          )}
          value={draft.status}
        />
      </FinanceField>
      <FinanceField label="Vencimento">
        <FinanceInput
          onChange={setField("dueAt")}
          type="date"
          value={draft.dueAt}
        />
      </FinanceField>
      <FinanceField label="Pagamento">
        <FinanceInput
          disabled={draft.status !== "paid"}
          onChange={setField("paidAt")}
          type="date"
          value={draft.paidAt}
        />
      </FinanceField>
      <FinanceField label="Vendedor" hint="Opcional para comissoes.">
        <FinanceInput
          onChange={setField("sellerUserId")}
          placeholder="Nome ou usuario responsavel"
          value={draft.sellerUserId}
        />
      </FinanceField>
      <FinanceField label="Observacao">
        <FinanceInput onChange={setField("notes")} value={draft.notes} />
      </FinanceField>
      {draft.recurrence === "recurring" ? (
        <RecurringFields draft={draft} setField={setField} />
      ) : null}
      {draft.recurrence === "once" ? (
        <ReceiptFields draft={draft} setDraft={setDraft} setField={setField} />
      ) : null}
    </div>
  );
}

function ReceiptFields({
  draft,
  setDraft,
  setField,
}: {
  draft: FinanceEntryDraft;
  setDraft: (draft: FinanceEntryDraft) => void;
  setField: FieldSetter;
}) {
  return (
    <div className="rounded-lg border border-line bg-app p-3 md:col-span-2">
      <div className="mb-3 flex items-center gap-2 text-sm font-black text-app-text">
        <Paperclip aria-hidden="true" className="size-4 text-accent-strong" />
        Comprovante opcional
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <FinanceField label="Arquivo">
          <FinanceInput
            accept="image/*,application/pdf"
            onChange={(event) =>
              setDraft({
                ...draft,
                documentFile: event.target.files?.[0] ?? null,
              })
            }
            type="file"
          />
        </FinanceField>
        <FinanceField label="Titulo">
          <FinanceInput
            disabled={!draft.documentFile}
            onChange={setField("documentTitle")}
            value={draft.documentTitle}
          />
        </FinanceField>
      </div>
    </div>
  );
}

function RecurringFields({
  draft,
  setField,
}: {
  draft: FinanceEntryDraft;
  setField: FieldSetter;
}) {
  return (
    <div className="grid gap-4 rounded-lg border border-line bg-app p-3 md:col-span-2 md:grid-cols-3">
      <FinanceField label="Frequencia">
        <FinanceSelect
          onChange={setField("recurrenceFrequency")}
          options={[
            { label: "Mensal", value: "monthly" },
            { label: "Semanal", value: "weekly" },
            { label: "Anual", value: "yearly" },
          ]}
          value={draft.recurrenceFrequency}
        />
      </FinanceField>
      <FinanceField label="Dia do vencimento">
        <FinanceInput
          max="31"
          min="1"
          onChange={setField("recurrenceDay")}
          type="number"
          value={draft.recurrenceDay}
        />
      </FinanceField>
      <FinanceField label="Duracao em ciclos">
        <FinanceInput
          min="1"
          onChange={setField("recurrenceOccurrences")}
          type="number"
          value={draft.recurrenceOccurrences}
        />
      </FinanceField>
    </div>
  );
}

type FieldSetter = (
  field: keyof FinanceEntryDraft,
) => (value: ChangeEvent<HTMLInputElement> | string) => void;

function optionClass(isActive: boolean) {
  return [
    "rounded-lg border p-5 text-left",
    isActive
      ? "border-accent bg-accent-soft text-accent-strong"
      : "border-line bg-app text-app-text",
  ].join(" ");
}
