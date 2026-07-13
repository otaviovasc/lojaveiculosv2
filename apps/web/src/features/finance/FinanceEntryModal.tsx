import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { FeatureDialog } from "../../components/ui/FeatureOverlay";
import { FeatureAlert } from "../../components/ui/FeatureStates";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import {
  createEntryDraft,
  entryToDraft,
  type FinanceEntryDraft,
} from "./financeBillsModel";
import { financeTypeLabels } from "./FinanceFormParts";
import {
  DetailsStep,
  RecurrenceStep,
  StepHeader,
  TypeStep,
} from "./FinanceEntryModalSteps";
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
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSaveError(null);
    setStep(entry ? 3 : 1);
    setDraft(entry ? entryToDraft(entry) : createEntryDraft(activeType));
  }, [activeType, entry, isOpen]);

  if (!isOpen) return null;

  const setField =
    (field: keyof FinanceEntryDraft) =>
    (value: ChangeEvent<HTMLInputElement> | string) => {
      setDraft((current) => ({
        ...current,
        [field]: typeof value === "string" ? value : value.target.value,
      }));
    };
  const canProceed =
    step < 3 || Boolean(draft.name.trim() && draft.amount && draft.category);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canProceed) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSubmit(draft);
      onClose();
    } catch (error) {
      setSaveError(
        formatApiErrorDisplay(error, "Não foi possível salvar o lançamento."),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <FeatureDialog
      className="max-w-3xl"
      description={`${financeTypeLabels[draft.type]} com vencimento, status e recibo.`}
      footer={
        <div className="grid gap-3">
          {saveError ? <FeatureAlert>{saveError}</FeatureAlert> : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
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
                Próximo
                <ChevronRight aria-hidden="true" className="size-4" />
              </button>
            ) : (
              <button
                className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-5 text-sm font-black text-inverse disabled:opacity-70"
                disabled={isSaving || !canProceed}
                onClick={() => formRef.current?.requestSubmit()}
                type="button"
              >
                <Check aria-hidden="true" className="size-4" />
                {isSaving ? "Salvando..." : "Salvar lançamento"}
              </button>
            )}
          </div>
        </div>
      }
      isOpen={isOpen}
      onClose={onClose}
      title={entry ? "Editar lançamento" : "Novo lançamento"}
    >
      <form onSubmit={(event) => void submit(event)} ref={formRef}>
        <StepHeader step={step} />
        {step === 1 ? (
          <TypeStep draft={draft} onChange={setDraft} />
        ) : step === 2 ? (
          <RecurrenceStep draft={draft} onChange={setDraft} />
        ) : (
          <DetailsStep draft={draft} setField={setField} setDraft={setDraft} />
        )}
      </form>
    </FeatureDialog>
  );
}
