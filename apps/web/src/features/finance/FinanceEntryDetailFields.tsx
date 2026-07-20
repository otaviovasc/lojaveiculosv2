import { ExternalLink, Paperclip } from "lucide-react";
import type { ChangeEvent } from "react";
import { FeatureAlert } from "../../components/ui/FeatureStates";
import { FeatureRowAction } from "../../components/ui/FeatureTable";
import { cx } from "../../components/ui/featureShared";
import type { FinanceEntryDraft } from "./financeBillsModel";
import { FinanceField, FinanceInput, FinanceSelect } from "./FinanceFormParts";
import type { FinanceEntryDocument } from "./types";

export type FinanceDraftFieldSetter = (
  field: keyof FinanceEntryDraft,
) => (value: ChangeEvent<HTMLInputElement> | string) => void;

export type EntryDocumentsState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; documents: readonly FinanceEntryDocument[] };

export function EntryDocumentsSection({
  className,
  onOpen,
  openingDocumentId,
  state,
}: {
  className?: string;
  onOpen: (entryDocument: FinanceEntryDocument) => void;
  openingDocumentId?: string | null;
  state: EntryDocumentsState;
}) {
  return (
    <div className={cx("rounded-lg border border-line bg-app p-3", className)}>
      <div className="mb-3 flex items-center gap-2 text-sm font-black text-app-text">
        <Paperclip aria-hidden="true" className="size-4 text-accent-strong" />
        Comprovantes anexados
      </div>
      {state.kind === "loading" ? (
        <p className="text-sm font-bold text-muted">
          Carregando comprovantes...
        </p>
      ) : state.kind === "error" ? (
        <FeatureAlert>{state.message}</FeatureAlert>
      ) : state.documents.length ? (
        <ul className="grid gap-2">
          {state.documents.map((entryDocument) => {
            const label =
              entryDocument.title ||
              entryDocument.fileName ||
              "Comprovante anexado";
            return (
              <li
                className="flex items-center justify-between gap-2 rounded-lg border border-line bg-panel px-3 py-2"
                key={entryDocument.id}
              >
                <span className="min-w-0 truncate text-sm font-bold text-app-text">
                  {label}
                </span>
                <FeatureRowAction
                  ariaLabel={`Abrir comprovante ${label}`}
                  disabled={openingDocumentId === entryDocument.id}
                  icon={ExternalLink}
                  onClick={() => onOpen(entryDocument)}
                  tooltip="Abrir"
                />
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm font-bold text-muted">
          Nenhum comprovante anexado.
        </p>
      )}
    </div>
  );
}

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
