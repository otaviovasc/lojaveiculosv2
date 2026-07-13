import {
  Check,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Save,
} from "lucide-react";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import { FeatureEmptyState } from "../../components/ui/FeatureStates";
import type { SaleRecord } from "./types";

export const saleWorkspaceSteps = [
  "Veículo & Comprador",
  "Valores, Pagos & Serviços",
  "Documentos & Validação",
  "Formalização & Download",
] as const;

export function SaleWorkspaceEmptyState({ onBack }: { onBack?: () => void }) {
  return (
    <FeatureEmptyState
      action={
        onBack ? (
          <FeatureActionButton
            icon={ChevronLeft}
            label="Voltar para Lista de Vendas"
            onClick={onBack}
          />
        ) : undefined
      }
      body="Selecione um rascunho de venda no pipeline ou inicie um novo preenchimento clicando no botão."
      className="sales-glass-panel min-h-[300px] border border-line shadow-sm"
      icon={HelpCircle}
      title="Nenhuma venda selecionada"
    />
  );
}

export function SaleWorkspaceHeader({
  currentStep,
  isSaving,
  onBack,
  onStepChange,
  sale,
}: {
  currentStep: number;
  isSaving: boolean;
  onBack?: () => void;
  onStepChange: (step: number) => void;
  sale: SaleRecord;
}) {
  return (
    <div className="sales-glass-panel p-5 bg-panel border border-line flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onBack ? (
            <button
              className="sales-secondary-button !min-h-9 !h-9 !py-0 !px-3 text-xs flex items-center gap-1.5 hover:bg-app-elevated/80"
              onClick={onBack}
              type="button"
            >
              <ChevronLeft className="size-4 text-accent" />
              <span>Voltar</span>
            </button>
          ) : null}
          <div>
            <h2 className="text-base font-black text-app-text uppercase tracking-wider leading-tight">
              Formalização de Venda
            </h2>
            <p className="text-xs font-bold text-muted mt-0.5">
              Revisão {sale.revision}
              {sale.correctionOfSaleId ? " · Correção da venda original" : ""}
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
        {saleWorkspaceSteps.map((step, index) => (
          <button
            className={`sales-wizard-step ${
              index === currentStep ? "sales-wizard-step-active" : ""
            } ${index < currentStep ? "sales-wizard-step-completed" : ""}`}
            key={step}
            onClick={() => onStepChange(index)}
            type="button"
          >
            {index < currentStep ? (
              <Check className="size-3.5" />
            ) : (
              <span className="text-xs shrink-0 size-4.5 rounded-full bg-line/65 flex items-center justify-center font-black">
                {index + 1}
              </span>
            )}
            <span>{step}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function SaleWorkspaceMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[9999] rounded-2xl border border-line bg-panel p-4 shadow-xl flex items-center gap-3 max-w-sm">
      <span className="size-2 rounded-full bg-accent animate-ping" />
      <div className="flex flex-col gap-0.5 text-left">
        <span className="text-xs font-black text-muted uppercase tracking-wider">
          Formalização
        </span>
        <span className="text-xs font-bold text-app-text">{message}</span>
      </div>
    </div>
  );
}

export function SaleWorkspaceNavigation({
  currentStep,
  onBack,
  onFinish,
  onNext,
}: {
  currentStep: number;
  onBack: () => void;
  onFinish: () => void;
  onNext: () => void;
}) {
  return (
    <div className="sales-glass-panel p-4 bg-panel border border-line flex justify-between items-center">
      <button
        className="sales-secondary-button"
        disabled={currentStep === 0}
        onClick={onBack}
        type="button"
      >
        Voltar
      </button>
      {currentStep < saleWorkspaceSteps.length - 1 ? (
        <button
          className="sales-primary-button flex items-center gap-1"
          onClick={onNext}
          type="button"
        >
          <div className="gloss-overlay" />
          <span>Avançar</span>
          <ChevronRight className="size-4" />
        </button>
      ) : (
        <button
          className="sales-secondary-button border-emerald-500/30 text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/40"
          onClick={onFinish}
          type="button"
        >
          <Check className="size-4 shrink-0" />
          <span>Finalizar e Ver Lista</span>
        </button>
      )}
    </div>
  );
}
