import { Paperclip } from "lucide-react";
import type { ChangeEvent } from "react";
import type { FinanceEntryDraft } from "./financeBillsModel";
import { FinanceField, FinanceInput, FinanceSelect } from "./FinanceFormParts";

export type FinanceDraftFieldSetter = (
  field: keyof FinanceEntryDraft,
) => (value: ChangeEvent<HTMLInputElement> | string) => void;

export function ReceiptFields({
  draft,
  setDraft,
  setField,
}: {
  draft: FinanceEntryDraft;
  setDraft: (draft: FinanceEntryDraft) => void;
  setField: FinanceDraftFieldSetter;
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
        <FinanceField label="Título">
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

export function RecurringFields({
  draft,
  setField,
}: {
  draft: FinanceEntryDraft;
  setField: FinanceDraftFieldSetter;
}) {
  return (
    <div className="grid gap-4 rounded-lg border border-line bg-app p-3 md:col-span-2 md:grid-cols-3">
      <FinanceField label="Frequência">
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
      <FinanceField label="Duração em ciclos">
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
