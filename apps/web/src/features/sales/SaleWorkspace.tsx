import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { Check, HelpCircle, Save } from "lucide-react";
import {
  ContextSection,
  DocumentsSection,
  PaymentsSection,
  TermsSection,
} from "./SaleWorkspaceParts";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import { ReviewSection } from "./SaleReviewSection";
import { StickySaleSummary } from "./SaleSummaryPanel";
import { toDraftInput } from "./salesModel";
import {
  emptySaleContextOptions,
  type SaleContextOptions,
} from "./saleContextOptions";
import type { SaleRecord } from "./types";

export function SaleWorkspace({
  contextMessage = null,
  contextOptions = emptySaleContextOptions,
  onCancel,
  onClose,
  onReserve,
  onSave,
  sale,
}: {
  contextMessage?: string | null;
  contextOptions?: SaleContextOptions;
  onCancel: (sale: SaleRecord) => Promise<SaleRecord | void>;
  onClose: (sale: SaleRecord) => Promise<SaleRecord | void>;
  onReserve: (sale: SaleRecord) => Promise<SaleRecord | void>;
  onSave: (sale: SaleRecord) => Promise<SaleRecord>;
  sale: SaleRecord | null;
}) {
  const [draft, setDraft] = useState<SaleRecord | null>(sale);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const autosaveTimerRef = useRef<number | undefined>(undefined);
  const lastSavedRef = useRef("");

  useEffect(() => {
    setDraft(sale);
    lastSavedRef.current = sale ? serializeSale(sale) : "";
    // Reset step to 0 when a new sale is selected
    if (sale?.id !== draft?.id) {
      setCurrentStep(0);
    }
  }, [sale]);

  useEffect(() => {
    if (!draft) return;
    if (draft.status !== "draft") return;
    const serialized = serializeSale(draft);
    if (serialized === lastSavedRef.current) return;
    setIsSaving(true);
    clearAutosaveTimer(autosaveTimerRef);
    autosaveTimerRef.current = window.setTimeout(() => {
      void onSave(draft)
        .then(() => {
          lastSavedRef.current = serialized;
          setMessage("Rascunho salvo automaticamente");
        })
        .catch((error) => setMessage(errorMessage(error)))
        .finally(() => {
          autosaveTimerRef.current = undefined;
          setIsSaving(false);
        });
    }, 650);
    return () => clearAutosaveTimer(autosaveTimerRef);
  }, [draft, onSave]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (message) {
      timer = setTimeout(() => setMessage(null), 3000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [message]);

  const update = (updater: (sale: SaleRecord) => SaleRecord) => {
    setDraft((current) => (current ? updater(current) : current));
  };

  const steps = useMemo(
    () => ["Contexto", "Valores", "Pagamentos", "Documentos", "Revisão"],
    [],
  );

  if (!draft) {
    return (
      <section className="sales-glass-panel p-12 text-center flex flex-col items-center justify-center border border-line shadow-sm min-h-[300px]">
        <div className="size-16 rounded-full bg-app-elevated flex items-center justify-center text-muted mb-4 border border-line/45">
          <HelpCircle className="size-8 text-muted/60" />
        </div>
        <h3 className="text-lg font-black text-app-text">
          Nenhuma venda selecionada
        </h3>
        <p className="mt-2 text-xs font-bold text-muted max-w-sm w-full leading-relaxed">
          Selecione um rascunho de venda no pipeline ao lado ou inicie um novo
          preenchimento clicando no botão de adição.
        </p>
      </section>
    );
  }

  const runTransition = async (
    action: (sale: SaleRecord) => Promise<SaleRecord | void>,
  ) => {
    clearAutosaveTimer(autosaveTimerRef);
    setIsSaving(true);
    try {
      const saved = await onSave(draft);
      const transitioned = await action(saved);
      lastSavedRef.current = serializeSale(transitioned ?? saved);
      setMessage("Status da venda atualizado");
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] items-start">
      <div className="flex flex-col gap-4">
        {/* Wizard Controls Panel */}
        <div className="sales-glass-panel p-5 bg-panel border border-line">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-app-text leading-tight">
                Fluxo de Formalização
              </h2>
              <p className="text-xs font-bold text-muted mt-1">
                Ref: {draft.id.slice(0, 8)} · Revisão {draft.revision}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-black text-muted bg-app-elevated/60 px-3 py-1.5 rounded-full border border-line">
              <Save
                className={
                  "size-3.5 " +
                  (isSaving ? "text-accent animate-pulse" : "text-muted")
                }
              />
              <span>{isSaving ? "Salvando..." : "Salvo"}</span>
            </div>
          </div>

          <div className="sales-wizard-steps">
            {steps.map((step, index) => {
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              return (
                <button
                  className={`sales-wizard-step ${
                    isActive ? "sales-wizard-step-active" : ""
                  } ${isCompleted ? "sales-wizard-step-completed" : ""}`}
                  key={step}
                  onClick={() => setCurrentStep(index)}
                  type="button"
                >
                  {isCompleted ? (
                    <Check className="size-3.5" />
                  ) : (
                    <span className="text-xs shrink-0 size-4.5 rounded-full bg-line/65 flex items-center justify-center font-black">
                      {index + 1}
                    </span>
                  )}
                  <span>{step}</span>
                </button>
              );
            })}
          </div>
        </div>

        {message ? (
          <div className="rounded-2xl border border-line bg-accent-soft px-4 py-3 text-xs font-black text-accent-strong flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-accent-strong animate-ping" />
            <span>{message}</span>
          </div>
        ) : null}

        {/* Wizard Step Forms */}
        <div className="flex flex-col gap-4">
          {currentStep === 0 && (
            <ContextSection
              contextMessage={contextMessage}
              options={contextOptions}
              sale={draft}
              update={update}
            />
          )}
          {currentStep === 1 && <TermsSection sale={draft} update={update} />}
          {currentStep === 2 && (
            <PaymentsSection sale={draft} update={update} />
          )}
          {currentStep === 3 && (
            <DocumentsSection sale={draft} update={update} />
          )}
          {currentStep === 4 && <ReviewSection sale={draft} />}
        </div>

        {/* Navigation Buttons Row */}
        <div className="sales-glass-panel p-4 bg-panel border border-line flex justify-between items-center">
          <button
            className="sales-secondary-button"
            disabled={currentStep === 0}
            onClick={() => setCurrentStep((prev) => prev - 1)}
            style={{
              opacity: currentStep === 0 ? 0.5 : 1,
              cursor: currentStep === 0 ? "not-allowed" : "pointer",
            }}
            type="button"
          >
            Voltar
          </button>
          {currentStep < steps.length - 1 ? (
            <button
              className="sales-primary-button"
              onClick={() => setCurrentStep((prev) => prev + 1)}
              type="button"
            >
              Avançar
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-3 py-1.5 rounded-xl uppercase tracking-wider">
              <Check className="size-4" />
              Revisão Finalizada
            </span>
          )}
        </div>
      </div>

      <StickySaleSummary
        isSaving={isSaving}
        onCancel={() => void runTransition(onCancel)}
        onClose={() => void runTransition(onClose)}
        onReserve={() => void runTransition(onReserve)}
        sale={draft}
      />
    </section>
  );
}

function serializeSale(sale: SaleRecord): string {
  return JSON.stringify(toDraftInput(sale));
}

function errorMessage(error: unknown): string {
  return formatApiErrorDisplay(error, "Não foi possível salvar a venda.");
}

function clearAutosaveTimer(ref: RefObject<number | undefined>) {
  if (ref.current !== undefined) {
    window.clearTimeout(ref.current);
    ref.current = undefined;
  }
}
