import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useRef, useState } from "react";
import {
  FeatureDialog,
  FeatureDialogActions,
} from "../../components/ui/FeatureOverlay";
import { FeatureAlert } from "../../components/ui/FeatureStates";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { SaleSellerOption } from "../sales/saleContextOptions";
import type { FinanceApi } from "./apiClient";
import {
  EntryDocumentsSection,
  type EntryDocumentsState,
} from "./FinanceEntryDetailFields";
import {
  createEntryDraft,
  entryToDraft,
  recurringEntryToDraft,
  type FinanceEntryDraft,
} from "./financeBillsModel";
import { financeTypeLabels } from "./FinanceFormParts";
import {
  DetailsStep,
  EditContextSummary,
  RecurrenceStep,
  StepHeader,
  TypeStep,
} from "./FinanceEntryModalSteps";
import type {
  FinanceEntry,
  FinanceEntryDocument,
  FinanceEntryType,
  FinanceRecurringEntry,
} from "./types";

export function FinanceEntryModal({
  activeType,
  api,
  entry,
  isOpen,
  onClose,
  onSubmit,
  recurringEntry,
  sellerOptions = [],
}: {
  activeType: FinanceEntryType;
  api?: FinanceApi | null;
  entry: FinanceEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (draft: FinanceEntryDraft) => Promise<void>;
  recurringEntry?: FinanceRecurringEntry | null;
  sellerOptions?: readonly SaleSellerOption[];
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [draft, setDraft] = useState(() => createEntryDraft(activeType));
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [documentsState, setDocumentsState] = useState<EntryDocumentsState>({
    documents: [],
    kind: "ready",
  });
  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSaveError(null);
    setStep(entry || recurringEntry ? 3 : 1);
    setDraft(
      recurringEntry
        ? recurringEntryToDraft(recurringEntry)
        : entry
          ? entryToDraft(entry)
          : createEntryDraft(activeType),
    );
  }, [activeType, entry, isOpen, recurringEntry]);

  useEffect(() => {
    if (!isOpen || !entry || !api) {
      setDocumentsState({ documents: [], kind: "ready" });
      return;
    }
    let active = true;
    setDocumentsState({ kind: "loading" });
    api
      .getEntryDetail(entry.id)
      .then((detail) => {
        if (!active) return;
        setDocumentsState({
          documents: detail.documents ?? [],
          kind: "ready",
        });
      })
      .catch((error: unknown) => {
        if (!active) return;
        setDocumentsState({
          kind: "error",
          message: formatApiErrorDisplay(
            error,
            "Não foi possível carregar os comprovantes.",
          ),
        });
      });
    return () => {
      active = false;
    };
  }, [api, entry, isOpen]);

  if (!isOpen) return null;

  const setField =
    (field: keyof FinanceEntryDraft) =>
    (value: ChangeEvent<HTMLInputElement> | string) => {
      setDraft((current) => ({
        ...current,
        [field]: typeof value === "string" ? value : value.target.value,
      }));
    };
  const amount = Number(draft.amount.replace(",", "."));
  const canProceed =
    step < 3 ||
    Boolean(
      draft.name.trim() &&
      draft.category &&
      Number.isFinite(amount) &&
      amount > 0,
    );

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

  const openDocument = async (entryDocument: FinanceEntryDocument) => {
    if (!api || !entry) return;
    setOpeningDocumentId(entryDocument.id);
    setSaveError(null);
    try {
      const blob = await api.openEntryDocument(entry.id, entryDocument.id);
      const url = URL.createObjectURL(blob);
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (!opened) {
        const link = window.document.createElement("a");
        link.href = url;
        link.download =
          entryDocument.fileName || entryDocument.title || "comprovante";
        link.click();
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      setSaveError(
        formatApiErrorDisplay(error, "Não foi possível abrir o comprovante."),
      );
    } finally {
      setOpeningDocumentId(null);
    }
  };

  const isEditing = Boolean(entry || recurringEntry);
  const title = recurringEntry
    ? "Editar recorrência"
    : entry
      ? "Editar lançamento"
      : "Novo lançamento";
  const description = recurringEntry
    ? "Modelo recorrente com frequência, dia de vencimento e valor."
    : `${financeTypeLabels[draft.type]} com vencimento, status e recibo.`;

  return (
    <FeatureDialog
      className={`max-w-3xl${activeType === "commission" ? " commission-dialog" : ""}`}
      description={description}
      footer={
        <div className="grid gap-3">
          {saveError ? <FeatureAlert>{saveError}</FeatureAlert> : null}
          {isEditing ? (
            <FeatureDialogActions
              confirmDisabled={!canProceed}
              confirmIcon={<Check aria-hidden="true" className="size-4" />}
              confirmLabel={
                recurringEntry ? "Salvar recorrência" : "Salvar lançamento"
              }
              isLoading={isSaving}
              loadingLabel="Salvando..."
              onCancel={onClose}
              onConfirm={() => formRef.current?.requestSubmit()}
            />
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="flex gap-2">
                {step > 1 ? (
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
              {step < 3 ? (
                <button
                  className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-5 text-sm font-black text-accent-foreground"
                  onClick={() => setStep((current) => (current + 1) as 2 | 3)}
                  type="button"
                >
                  Próximo
                  <ChevronRight aria-hidden="true" className="size-4" />
                </button>
              ) : (
                <button
                  className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-5 text-sm font-black text-accent-foreground disabled:opacity-70"
                  disabled={isSaving || !canProceed}
                  onClick={() => formRef.current?.requestSubmit()}
                  type="button"
                >
                  <Check aria-hidden="true" className="size-4" />
                  {isSaving ? "Salvando..." : "Salvar lançamento"}
                </button>
              )}
            </div>
          )}
        </div>
      }
      isOpen={isOpen}
      onClose={onClose}
      title={title}
    >
      <form onSubmit={(event) => void submit(event)} ref={formRef}>
        {isEditing ? (
          <EditContextSummary draft={draft} />
        ) : (
          <StepHeader step={step} />
        )}
        {step === 1 ? (
          <TypeStep draft={draft} onChange={setDraft} />
        ) : step === 2 ? (
          <RecurrenceStep draft={draft} onChange={setDraft} />
        ) : (
          <DetailsStep
            draft={draft}
            isRecurringEdit={Boolean(recurringEntry)}
            sellerOptions={sellerOptions}
            setField={setField}
            setDraft={setDraft}
          />
        )}
        {entry && !recurringEntry && api ? (
          <EntryDocumentsSection
            className="mt-4"
            onOpen={(entryDocument) => void openDocument(entryDocument)}
            openingDocumentId={openingDocumentId}
            state={documentsState}
          />
        ) : null}
      </form>
    </FeatureDialog>
  );
}
