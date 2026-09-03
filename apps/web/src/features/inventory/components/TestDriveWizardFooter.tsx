import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Printer,
} from "lucide-react";
import { Button } from "../../../components/ui/button";
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
    <div className="p-4 sm:p-5 border-t border-line flex items-center justify-between bg-panel sticky bottom-0 z-10">
      {step === "details" ? (
        <Button type="button" variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4 mr-1.5" />
          Voltar
        </Button>
      ) : step === "lead" ? (
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Cancelar
        </Button>
      ) : (
        <div />
      )}

      {step === "lead" && (
        <Button type="button" variant="default" size="sm" onClick={onNext}>
          Continuar
          <ArrowRight className="size-4 ml-1.5" />
        </Button>
      )}

      {step === "details" && (
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={onSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <Loader2 className="size-4 animate-spin mr-1.5" />
          ) : (
            <CheckCircle2 className="size-4 mr-1.5" />
          )}
          {submitting ? "Registrando..." : "Salvar & Concluir"}
        </Button>
      )}

      {step === "success" && (
        <div className="flex gap-2 w-full justify-end">
          <Button type="button" variant="default" size="sm" onClick={onPrint}>
            <Printer className="size-4 mr-1.5" />
            Visualizar e Imprimir Termo
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </div>
      )}
    </div>
  );
}
