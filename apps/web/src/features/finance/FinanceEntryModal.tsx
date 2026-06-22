import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";
import {
  createEntryDraft,
  entryToDraft,
  type FinanceEntryDraft,
} from "./financeBillsModel";
import { financeTypeLabels } from "./FinanceFormParts";
import { DetailsStep, RecurrenceStep, StepHeader, TypeStep } from "./FinanceEntryModalSteps";
import type { FinanceEntry, FinanceEntryType } from "./types";

export function FinanceEntryModal({
  activeType,
  entry,
  isOpen,
  onClose,
  onSubmit,
}: {
  activeType: FinanceEntryType;
  entry: FinanceEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (draft: FinanceEntryDraft) => Promise<void>;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [draft, setDraft] = useState(() => createEntryDraft(activeType));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setStep(entry ? 3 : 1);
    setDraft(entry ? entryToDraft(entry) : createEntryDraft(activeType));
  }, [activeType, entry, isOpen]);

  if (!isOpen) return null;

  const setField =
    (field: keyof FinanceEntryDraft) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setDraft((current) => ({ ...current, [field]: event.target.value }));
    };
  const canProceed =
    step < 3 || Boolean(draft.name.trim() && draft.amount && draft.category);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canProceed) return;
    setIsSaving(true);
    try {
      await onSubmit(draft);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-overlay)] p-3">
      <form
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-line bg-panel shadow-[var(--shadow-panel)]"
        onSubmit={(event) => void submit(event)}
      >
        <header className="flex items-center justify-between border-b border-line p-5">
          <div>
            <h2 className="text-xl font-black text-app-text">
              {entry ? "Editar lancamento" : "Novo lancamento"}
            </h2>
            <p className="text-sm font-bold text-muted">
              {financeTypeLabels[draft.type]} com vencimento, status e recibo.
            </p>
          </div>
          <button
            aria-label="Fechar"
            className="rounded-lg border border-line bg-app p-2 text-muted"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          <StepHeader step={step} />
          {step === 1 ? (
            <TypeStep draft={draft} onChange={setDraft} />
          ) : step === 2 ? (
            <RecurrenceStep draft={draft} onChange={setDraft} />
          ) : (
            <DetailsStep draft={draft} setField={setField} setDraft={setDraft} />
          )}
        </div>

        <footer className="flex flex-col gap-3 border-t border-line bg-app p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            {step > 1 && !entry ? (
              <button
                className="flex min-h-11 items-center gap-2 rounded-lg border border-line bg-panel px-4 text-sm font-black text-app-text"
                onClick={() => setStep((current) => (current - 1) as 1 | 2)}
                type="button"
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
                Voltar
              </button>
            ) : null}
            <button
              className="min-h-11 rounded-lg px-4 text-sm font-black text-muted"
              onClick={onClose}
              type="button"
            >
              Cancelar
            </button>
          </div>
          {step < 3 && !entry ? (
            <button
              className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-5 text-sm font-black text-inverse"
              onClick={() => setStep((current) => (current + 1) as 2 | 3)}
              type="button"
            >
              Proximo
              <ChevronRight aria-hidden="true" className="size-4" />
            </button>
          ) : (
            <button
              className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-5 text-sm font-black text-inverse disabled:opacity-70"
              disabled={isSaving || !canProceed}
              type="submit"
            >
              <Check aria-hidden="true" className="size-4" />
              {isSaving ? "Salvando..." : "Salvar lancamento"}
            </button>
          )}
        </footer>
      </form>
    </div>
  );
}
