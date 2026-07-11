import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  HelpCircle,
  Save,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { ContextSection } from "./SaleContextSection";
import { ServicesSection } from "./SaleServicesSection";
import { DocumentsSection } from "./SaleDocumentsSection";
import { FinalizationSection } from "./SaleFinalizationSection";
import { ReviewSection } from "./SaleReviewSection";
import { StickySaleSummary } from "./SaleSummaryPanel";
import { canPersistSaleWorkspaceEdits } from "./salesModel";
import {
  clearSaleAutosaveTimer,
  createSaleSaveState,
  isSaleDraftSaved,
  resetSaleSaveState,
  saleSaveErrorMessage,
  saveSaleDraft,
  serializeSaleDraft,
} from "./saleWorkspacePersistence";
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
  onBack,
}: {
  contextMessage?: string | null;
  contextOptions?: SaleContextOptions;
  onCancel: (sale: SaleRecord) => Promise<SaleRecord | void>;
  onClose: (sale: SaleRecord) => Promise<SaleRecord | void>;
  onReserve: (sale: SaleRecord) => Promise<SaleRecord | void>;
  onSave: (sale: SaleRecord) => Promise<SaleRecord>;
  sale: SaleRecord | null;
  onBack?: () => void;
}) {
  const [draft, setDraft] = useState<SaleRecord | null>(sale);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const autosaveTimerRef = useRef<number | undefined>(undefined);
  const draftRef = useRef<SaleRecord | null>(sale);
  const saveStateRef = useRef(createSaleSaveState(sale));

  useEffect(() => {
    const previousDraftId = draftRef.current?.id;
    setDraft(sale);
    draftRef.current = sale;
    resetSaleSaveState(saveStateRef.current, sale);
    if (sale?.id !== previousDraftId) {
      setCurrentStep(0);
    }
  }, [sale]);

  const persistDraft = useCallback(
    async (saleToSave: SaleRecord | null) => {
      if (!saleToSave || !canPersistSaleWorkspaceEdits(saleToSave)) {
        return saleToSave;
      }
      clearSaleAutosaveTimer(autosaveTimerRef);
      const result = await saveSaleDraft(
        saveStateRef.current,
        saleToSave,
        onSave,
      );
      if (result.submitted) {
        const currentDraft = draftRef.current;
        if (
          !currentDraft ||
          serializeSaleDraft(currentDraft) === result.submitted
        ) {
          setDraft(result.sale);
          draftRef.current = result.sale;
        }
      }
      return result.sale;
    },
    [onSave],
  );

  useEffect(() => {
    if (!draft || !canPersistSaleWorkspaceEdits(draft)) return;
    if (isSaleDraftSaved(saveStateRef.current, draft)) return;
    setIsSaving(true);
    clearSaleAutosaveTimer(autosaveTimerRef);
    autosaveTimerRef.current = window.setTimeout(() => {
      void persistDraft(draft)
        .then(() => {
          setMessage("Rascunho salvo automaticamente");
        })
        .catch((error) => setMessage(saleSaveErrorMessage(error)))
        .finally(() => {
          autosaveTimerRef.current = undefined;
          setIsSaving(false);
        });
    }, 650);
    return () => clearSaleAutosaveTimer(autosaveTimerRef);
  }, [draft, persistDraft]);

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
    setDraft((current) => {
      const next = current ? updater(current) : current;
      draftRef.current = next;
      return next;
    });
  };

  const handleBack = async () => {
    if (!onBack) return;
    clearSaleAutosaveTimer(autosaveTimerRef);
    setIsSaving(true);
    try {
      await persistDraft(draftRef.current);
      onBack();
    } catch (error) {
      setMessage(saleSaveErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const steps = useMemo(
    () => [
      "Veículo & Comprador",
      "Valores, Pagos & Serviços",
      "Documentos & Validação",
      "Formalização & Download",
    ],
    [],
  );

  if (!draft) {
    return (
      <section className="sales-glass-panel p-12 text-center flex flex-col items-center justify-center border border-line shadow-sm min-h-[300px]">
        <div className="size-16 rounded-full bg-app-elevated flex items-center justify-center text-muted mb-4 border border-line/45">
          <HelpCircle className="size-8 text-muted/60" />
        </div>
        <h3 className="text-sm font-black text-app-text uppercase tracking-wider">
          Nenhuma venda selecionada
        </h3>
        <p className="mt-2 text-xs font-bold text-muted max-w-sm w-full leading-relaxed">
          Selecione um rascunho de venda no pipeline ou inicie um novo
          preenchimento clicando no botão.
        </p>
        {onBack && (
          <button
            onClick={() => void handleBack()}
            className="sales-secondary-button mt-4 text-xs"
            type="button"
          >
            Voltar para Lista de Vendas
          </button>
        )}
      </section>
    );
  }

  const runTransition = async (
    action: (sale: SaleRecord) => Promise<SaleRecord | void>,
  ) => {
    clearSaleAutosaveTimer(autosaveTimerRef);
    setIsSaving(true);
    try {
      const saved = await persistDraft(draft);
      if (!saved) return;
      const transitioned = await action(saved);
      resetSaleSaveState(saveStateRef.current, transitioned ?? saved);
      setMessage("Status da venda atualizado");
    } catch (error) {
      setMessage(saleSaveErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] items-start">
      <div className="flex flex-col gap-4">
        <div className="sales-glass-panel p-5 bg-panel border border-line flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {onBack && (
                <button
                  type="button"
                  onClick={() => void handleBack()}
                  className="sales-secondary-button !min-h-9 !h-9 !py-0 !px-3 text-xs flex items-center gap-1.5 hover:bg-app-elevated/80"
                >
                  <ChevronLeft className="size-4 text-accent" />
                  <span>Voltar</span>
                </button>
              )}
              <div>
                <h2 className="text-base font-black text-app-text uppercase tracking-wider leading-tight">
                  Formalização de Venda
                </h2>
                <p className="text-xs font-bold text-muted mt-0.5">
                  Revisão {draft.revision}
                </p>
              </div>
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
          <div className="fixed bottom-6 right-6 z-[9999] rounded-2xl border border-line bg-panel p-4 shadow-xl flex items-center gap-3 max-w-sm">
            <span className="size-2 rounded-full bg-accent animate-ping" />
            <div className="flex flex-col gap-0.5 text-left">
              <span className="text-xs font-black text-muted uppercase tracking-wider">
                Formalização
              </span>
              <span className="text-xs font-bold text-app-text">{message}</span>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-4">
          {currentStep === 0 && (
            <ContextSection
              contextMessage={contextMessage}
              options={contextOptions}
              sale={draft}
              update={update}
            />
          )}
          {currentStep === 1 && (
            <ServicesSection sale={draft} update={update} />
          )}
          {currentStep === 2 && (
            <DocumentsSection sale={draft} update={update} />
          )}
          {currentStep === 3 && (
            <div className="flex flex-col gap-4">
              <ReviewSection sale={draft} />
              <FinalizationSection sale={draft} />
            </div>
          )}
        </div>

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
              className="sales-primary-button flex items-center gap-1"
              onClick={() => setCurrentStep((prev) => prev + 1)}
              type="button"
            >
              <div className="gloss-overlay" />
              <span>Avançar</span>
              <ChevronRight className="size-4" />
            </button>
          ) : (
            <button
              className="sales-secondary-button border-emerald-500/30 text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/40"
              onClick={() => void handleBack()}
              type="button"
            >
              <Check className="size-4 shrink-0" />
              <span>Finalizar e Ver Lista</span>
            </button>
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
