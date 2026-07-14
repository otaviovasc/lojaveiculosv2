import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Printer,
} from "lucide-react";
import type { TestDriveStep } from "./TestDriveWizardTypes";

export function TestDriveWizardFooter({
  step,
  submitting,
  onBack,
  onClose,
  onNext,
  onPrint,
  onSubmit,
}: {
  step: TestDriveStep;
  submitting: boolean;
  onBack: () => void;
  onClose: () => void;
  onNext: () => void;
  onPrint: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="p-6 border-t border-line flex items-center justify-between bg-panel sticky bottom-0 z-10">
      {step === "details" ? (
        <button
          onClick={onBack}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-app-elevated px-4 text-sm font-black text-app-text cursor-pointer hover:bg-line/25"
        >
          <ArrowLeft className="size-4" />
          Voltar
        </button>
      ) : (
        <div />
      )}

      {step === "lead" && (
        <button
          onClick={onNext}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-black text-accent-foreground cursor-pointer hover:bg-accent-strong hover:text-accent-strong-foreground"
        >
          Continuar
          <ArrowRight className="size-4" />
        </button>
      )}

      {step === "details" && (
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-black text-accent-foreground cursor-pointer hover:bg-accent-strong hover:text-accent-strong-foreground disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          {submitting ? "Salvando..." : "Salvar & Concluir"}
        </button>
      )}

      {step === "success" && (
        <div className="flex gap-2 w-full justify-center">
          <button
            onClick={onPrint}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-black text-accent-foreground cursor-pointer hover:bg-accent-strong hover:text-accent-strong-foreground flex-1"
          >
            <Printer className="size-4" />
            Visualizar Termo
          </button>
          <button
            onClick={onClose}
            className="flex min-h-11 items-center justify-center rounded-xl border border-line bg-app-elevated px-4 text-sm font-black text-app-text cursor-pointer hover:bg-line/25"
          >
            Concluir
          </button>
        </div>
      )}
    </div>
  );
}
