import {
  Check,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Save,
} from "lucide-react";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import {
  FeatureAlert,
  FeatureEmptyState,
} from "../../components/ui/FeatureStates";
import type { SaleWorkspaceStepReadiness } from "./saleWorkspaceReadiness";
import type { SaleRecord } from "./types";

export type SaleWorkspaceStepState = SaleWorkspaceStepReadiness & {
  isAccessible: boolean;
};

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
  stepReadiness,
}: {
  currentStep: number;
  isSaving: boolean;
  onBack?: () => void;
  onStepChange: (step: number) => void;
  sale: SaleRecord;
  stepReadiness: readonly SaleWorkspaceStepState[];
}) {
  const activeReadiness = stepReadiness[currentStep];
  const readinessClassName = activeReadiness?.isComplete
    ? "rounded-xl border border-success/25 bg-success/5 px-3 py-2 text-xs font-bold text-success-strong"
    : "rounded-xl border border-warning/30 bg-warning-soft px-3 py-2 text-xs font-bold text-warning-soft-foreground";
  const saveIconClassName = isSaving
    ? "size-3.5 text-accent animate-pulse"
    : "size-3.5 text-muted";

  return (
    <div className="sales-glass-panel p-5 bg-panel border border-line flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onBack ? (
            <button
              className="sales-secondary-button inline-flex flex-row items-center gap-2 whitespace-nowrap text-xs"
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

        <div
          aria-live="polite"
          className="inline-flex flex-row items-center gap-1.5 whitespace-nowrap text-xs font-black text-muted bg-app-elevated/60 px-3 py-1.5 rounded-full border border-line"
          role="status"
        >
          <Save aria-hidden="true" className={saveIconClassName} />
          <span>
            {isSaving ? "Salvando alterações..." : "Alterações salvas"}
          </span>
        </div>
      </div>

      <nav aria-label="Etapas da formalização" className="sales-wizard-steps">
        {saleWorkspaceSteps.map((step, index) => {
          const readiness = stepReadiness[index];
          const isAccessible = readiness?.isAccessible ?? true;
          const missingCount = readiness?.missingFields.length ?? 0;
          const isComplete = readiness?.isComplete ?? false;

          return (
            <button
              aria-current={index === currentStep ? "step" : undefined}
              aria-label={`${step}. ${
                missingCount === 0
                  ? "Sem pendências"
                  : `${missingCount} ${missingCount === 1 ? "pendência" : "pendências"}`
              }`}
              className={`sales-wizard-step ${
                index === currentStep ? "sales-wizard-step-active" : ""
              } ${
                index < currentStep && isComplete
                  ? "sales-wizard-step-completed"
                  : ""
              } disabled:cursor-not-allowed disabled:opacity-50`}
              disabled={!isAccessible}
              key={step}
              onClick={() => onStepChange(index)}
              type="button"
            >
              {index < currentStep && isComplete ? (
                <Check aria-hidden="true" className="size-3.5 shrink-0" />
              ) : (
                <span className="text-xs shrink-0 size-4.5 rounded-full bg-line/65 flex items-center justify-center font-black">
                  {index + 1}
                </span>
              )}
              <span>{step}</span>
              {missingCount > 0 ? (
                <span
                  aria-hidden="true"
                  className="inline-flex min-w-5 items-center justify-center rounded-full bg-warning-soft px-1.5 py-0.5 text-xs text-warning-soft-foreground"
                >
                  {missingCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className={readinessClassName} id="sale-workspace-step-readiness">
        {activeReadiness?.isComplete ? (
          <span>Etapa pronta. Você pode seguir.</span>
        ) : sale.status === "draft" ? (
          <span>
            Complete antes de avançar:{" "}
            {activeReadiness?.missingFields.join(", ")}.
          </span>
        ) : (
          <span>
            Pendências registradas nesta etapa:{" "}
            {activeReadiness?.missingFields.join(", ")}.
          </span>
        )}
      </div>
    </div>
  );
}

export function SaleWorkspaceMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div aria-live="polite" role="status">
      <FeatureAlert
        className="fixed bottom-6 right-6 z-[var(--z-index-popover)] max-w-sm shadow-xl"
        title="Formalização"
        tone="info"
      >
        {message}
      </FeatureAlert>
    </div>
  );
}

export function SaleWorkspaceNavigation({
  canClose,
  canAdvance,
  canReserve,
  currentStep,
  isSaving,
  onBack,
  onClose,
  onFinish,
  onNext,
  onReserve,
  sale,
}: {
  canClose?: boolean;
  canAdvance?: boolean;
  canReserve?: boolean;
  currentStep: number;
  isSaving?: boolean;
  onBack: () => void;
  onClose?: () => void;
  onFinish: () => void;
  onNext: () => void;
  onReserve?: () => void;
  sale?: SaleRecord;
}) {
  const isFinalStep = currentStep === saleWorkspaceSteps.length - 1;
  const isDraftOrPending =
    sale && (sale.status === "draft" || sale.status === "pending");

  return (
    <div className="sales-glass-panel p-4 bg-panel border border-line flex flex-wrap justify-between items-center gap-3">
      <button
        className="sales-secondary-button"
        disabled={currentStep === 0}
        onClick={onBack}
        type="button"
      >
        Voltar
      </button>

      {!isFinalStep ? (
        <button
          aria-describedby="sale-workspace-step-readiness"
          className="sales-primary-button inline-flex flex-row items-center gap-2 whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canAdvance}
          onClick={onNext}
          type="button"
        >
          <div className="gloss-overlay" />
          <span>Avançar</span>
          <ChevronRight className="size-4" />
        </button>
      ) : isDraftOrPending ? (
        <div className="flex items-center gap-2">
          {canReserve && onReserve ? (
            <button
              className="sales-secondary-button inline-flex flex-row items-center whitespace-nowrap"
              disabled={isSaving}
              onClick={onReserve}
              type="button"
            >
              Reservar Veículo
            </button>
          ) : null}

          {onClose ? (
            <button
              className="sales-primary-button inline-flex flex-row items-center gap-2 whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!canClose || isSaving}
              onClick={onClose}
              type="button"
            >
              <div className="gloss-overlay" />
              <Check className="size-4 shrink-0" />
              <span>Fechar Venda</span>
            </button>
          ) : null}
        </div>
      ) : (
        <button
          className="sales-secondary-button inline-flex flex-row items-center gap-2 whitespace-nowrap border-success/30 text-success-soft-foreground bg-success/5 hover:bg-success/10 hover:border-success/40"
          onClick={onFinish}
          type="button"
        >
          <Check className="size-4 shrink-0" />
          <span>Voltar para Lista de Vendas</span>
        </button>
      )}
    </div>
  );
}
