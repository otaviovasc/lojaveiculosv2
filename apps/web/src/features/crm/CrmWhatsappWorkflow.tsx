import type { CSSProperties, ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, X } from "lucide-react";

export type CrmWhatsappWorkflowStep = {
  description?: string;
  label: string;
};

export function CrmWhatsappWorkflowStepper({
  currentStep,
  onStepChange,
  steps,
}: {
  currentStep: number;
  onStepChange?: (step: number) => void;
  steps: readonly CrmWhatsappWorkflowStep[];
}) {
  return (
    <nav
      aria-label="Etapas do fluxo"
      className="crm-whatsapp-workflow-steps"
      style={{ "--crm-workflow-step-count": steps.length } as CSSProperties}
    >
      <ol>
        {steps.map((step, index) => {
          const completed = index < currentStep;
          const current = index === currentStep;
          const enabled = completed || current;
          return (
            <li
              data-state={
                completed ? "complete" : current ? "active" : "upcoming"
              }
              key={step.label}
            >
              <button
                aria-current={current ? "step" : undefined}
                disabled={!enabled || !onStepChange}
                onClick={() => onStepChange?.(index)}
                type="button"
              >
                <span className="crm-whatsapp-workflow-step-index">
                  {completed ? <Check aria-hidden="true" /> : index + 1}
                </span>
                <span>
                  <strong>{step.label}</strong>
                  {step.description ? <small>{step.description}</small> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function CrmWhatsappWorkflowPanel({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description?: ReactNode;
  title: string;
}) {
  return (
    <section className="crm-whatsapp-workflow-panel" tabIndex={-1}>
      <header>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </header>
      <div className="crm-whatsapp-workflow-panel-body">{children}</div>
    </section>
  );
}

export function CrmWhatsappWorkflowFooter({
  backDisabled,
  cancelLabel = "Cancelar",
  confirmIcon,
  confirmLabel = "Concluir",
  isBusy,
  isLastStep,
  nextDisabled,
  onBack,
  onCancel,
  onNext,
}: {
  backDisabled: boolean;
  cancelLabel?: string;
  confirmIcon?: ReactNode;
  confirmLabel?: string;
  isBusy?: boolean;
  isLastStep: boolean;
  nextDisabled: boolean;
  onBack: () => void;
  onCancel: () => void;
  onNext: () => void;
}) {
  return (
    <footer className="crm-whatsapp-workflow-footer">
      <button
        className="crm-workflow-cancel"
        disabled={isBusy}
        onClick={onCancel}
        type="button"
      >
        <X aria-hidden="true" />
        {cancelLabel}
      </button>
      <span />
      <button
        className="crm-workflow-back"
        disabled={backDisabled || isBusy}
        onClick={onBack}
        type="button"
      >
        <ArrowLeft aria-hidden="true" />
        Voltar
      </button>
      <button
        className="crm-workflow-next"
        disabled={nextDisabled || isBusy}
        onClick={onNext}
        type="button"
      >
        {isBusy ? (
          <Loader2 aria-hidden="true" className="animate-spin" />
        ) : null}
        {isLastStep ? confirmIcon : null}
        {isBusy ? "Salvando..." : isLastStep ? confirmLabel : "Continuar"}
        {!isLastStep && !isBusy ? <ArrowRight aria-hidden="true" /> : null}
      </button>
    </footer>
  );
}

export function CrmWhatsappModeBar({
  actions,
  children,
  summary,
}: {
  actions?: ReactNode;
  children?: ReactNode;
  summary?: ReactNode;
}) {
  return (
    <div className="crm-whatsapp-mode-bar">
      <div className="crm-whatsapp-mode-bar-main">
        {children}
        {summary ? <span>{summary}</span> : null}
      </div>
      {actions ? (
        <div className="crm-whatsapp-mode-bar-actions">{actions}</div>
      ) : null}
    </div>
  );
}
