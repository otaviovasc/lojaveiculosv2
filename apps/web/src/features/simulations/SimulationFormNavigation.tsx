import {
  BadgeDollarSign,
  CarFront,
  Check,
  ChevronLeft,
  ChevronRight,
  UserRound,
} from "lucide-react";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";

export type SimulationFormStep = "vehicle" | "applicant" | "terms" | "review";

const stepOrder: SimulationFormStep[] = [
  "vehicle",
  "applicant",
  "terms",
  "review",
];

export function previousSimulationStep(step: SimulationFormStep) {
  return stepOrder[Math.max(0, stepOrder.indexOf(step) - 1)] ?? "vehicle";
}

export function nextSimulationStep(step: SimulationFormStep) {
  return (
    stepOrder[Math.min(stepOrder.length - 1, stepOrder.indexOf(step) + 1)] ??
    "review"
  );
}

const steps = [
  { icon: CarFront, label: "Veículo", value: "vehicle" },
  { icon: UserRound, label: "Proponente", value: "applicant" },
  { icon: BadgeDollarSign, label: "Condições", value: "terms" },
  { icon: Check, label: "Revisão", value: "review" },
] as const;

export function SimulationFormStepper({
  onChange,
  step,
}: {
  onChange: (step: SimulationFormStep) => void;
  step: SimulationFormStep;
}) {
  const activeIndex = steps.findIndex((item) => item.value === step);
  return (
    <nav aria-label="Etapas da simulação" className="credere-form-stepper">
      <ol className="credere-form-stepper-track">
        {steps.map((item, index) => {
          const Icon = item.icon;
          const active = item.value === step;
          const complete = index < activeIndex;
          return (
            <li
              className="credere-form-step"
              data-active={active || undefined}
              data-complete={complete || undefined}
              key={item.value}
            >
              <button
                aria-current={active ? "step" : undefined}
                className="credere-form-step-button"
                onClick={() => onChange(item.value)}
                type="button"
              >
                <span aria-hidden="true" className="credere-form-step-marker">
                  {complete ? (
                    <Check className="size-3.5" />
                  ) : (
                    <span className="text-xs font-black">{index + 1}</span>
                  )}
                </span>
                <span className="credere-form-step-copy">
                  <Icon
                    className="credere-form-step-icon size-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="credere-form-step-label">{item.label}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function SimulationStepActions({
  isLast,
  isSubmitting,
  nextDisabled = false,
  nextHint = null,
  onBack,
  onNext,
  step,
}: {
  isLast: boolean;
  isSubmitting: boolean;
  nextDisabled?: boolean;
  nextHint?: string | null;
  onBack: (() => void) | null;
  onNext: (() => void) | null;
  step: SimulationFormStep;
}) {
  const activeIndex = steps.findIndex((item) => item.value === step);
  const activeLabel = steps[activeIndex]?.label ?? "";
  return (
    <div className="credere-form-actions">
      <p aria-hidden="true" className="credere-form-actions-progress">
        <span>Etapa</span>
        <strong>
          {String(activeIndex + 1).padStart(2, "0")} /{" "}
          {String(steps.length).padStart(2, "0")}
        </strong>
        <span>{activeLabel}</span>
      </p>
      <div className="credere-form-actions-buttons">
        {nextDisabled && nextHint ? (
          <p className="credere-form-actions-hint" role="status">
            {nextHint}
          </p>
        ) : null}
        {onBack ? (
          <FeatureActionButton
            icon={ChevronLeft}
            label="Voltar"
            onClick={onBack}
            type="button"
          />
        ) : null}
        {isLast ? (
          <FeatureActionButton
            icon={Check}
            isBusy={isSubmitting}
            label={isSubmitting ? "Enviando simulação" : "Simular no Credere"}
            type="submit"
            variant="primary"
          />
        ) : onNext ? (
          <FeatureActionButton
            disabled={nextDisabled}
            icon={ChevronRight}
            label="Continuar"
            onClick={onNext}
            {...(nextDisabled && nextHint ? { title: nextHint } : {})}
            type="button"
            variant="primary"
          />
        ) : null}
      </div>
    </div>
  );
}
