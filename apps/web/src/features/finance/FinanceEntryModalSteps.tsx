import { Repeat2 } from "lucide-react";
import type { SaleSellerOption } from "../sales/saleContextOptions";
import { FinanceDateField } from "./FinanceDateField";
import {
  ReceiptFields,
  RecurringFields,
  type FinanceDraftFieldSetter,
} from "./FinanceEntryDetailFields";
import {
  createEntryDraft,
  commissionCategories,
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
      {["Tipo", "Recorrência", "Detalhes"].map((label, index) => (
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
              ? "Saídas e contas a pagar"
              : type === "commission"
                ? "Valores devidos à equipe comercial"
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
            {recurrence === "once" ? "Único" : "Recorrente"}
          </strong>
          <span className="mt-2 block text-sm font-bold text-muted">
            {recurrence === "once"
              ? "Lançamento pontual"
              : "Mensalidade, aluguel ou parcelamento"}
          </span>
        </button>
      ))}
    </div>
  );
}

export function DetailsStep({
  draft,
  sellerOptions = [],
  setDraft,
  setField,
}: {
  draft: FinanceEntryDraft;
  sellerOptions?: readonly SaleSellerOption[];
  setDraft: (draft: FinanceEntryDraft) => void;
  setField: FinanceDraftFieldSetter;
}) {
  const categories =
    draft.type === "expense"
      ? expenseCategories
      : draft.type === "commission"
        ? commissionCategories
        : revenueCategories;
  const selectedSellerMissing =
    Boolean(draft.sellerUserId) &&
    !sellerOptions.some((seller) => seller.id === draft.sellerUserId);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FinanceField label="Identificação">
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
          min="0.01"
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
      <FinanceDateField
        label="Vencimento"
        onChange={setField("dueAt")}
        value={draft.dueAt}
      />
      <FinanceDateField
        disabled={draft.status !== "paid"}
        label="Pagamento"
        onChange={setField("paidAt")}
        value={draft.paidAt}
      />
      <FinanceField label="Vendedor" hint="Opcional para comissões.">
        <FinanceSelect
          onChange={setField("sellerUserId")}
          options={[
            { label: "Sem vendedor", value: "" },
            ...(selectedSellerMissing
              ? [
                  {
                    label: "Vendedor vinculado",
                    value: draft.sellerUserId,
                  },
                ]
              : []),
            ...sellerOptions.map((seller) => ({
              label: seller.label,
              value: seller.id,
            })),
          ]}
          value={draft.sellerUserId}
        />
      </FinanceField>
      <FinanceField label="Observação">
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

function optionClass(isActive: boolean) {
  return [
    "rounded-lg border p-5 text-left finance-option-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm cursor-pointer",
    isActive
      ? "border-accent bg-accent-soft text-accent-strong finance-option-card--active"
      : "border-line bg-app text-app-text hover:border-muted",
  ].join(" ");
}
