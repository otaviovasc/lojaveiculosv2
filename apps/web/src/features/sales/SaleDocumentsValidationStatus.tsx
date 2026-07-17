import { CheckCircle2, ShieldAlert } from "lucide-react";

export function SaleDocumentsValidationStatus({
  errors,
  isValid,
}: {
  errors: Record<string, string>;
  isValid: boolean;
}) {
  const statusClassName = isValid
    ? "bg-panel border-success-strong/25 text-app-text"
    : "bg-warning/10 border-warning/25 text-warning-strong";

  return (
    <div
      className={[
        "p-4 rounded-xl border flex items-center gap-3 transition-colors",
        statusClassName,
      ].join(" ")}
    >
      {isValid ? (
        <>
          <CheckCircle2 className="size-5 text-success-strong shrink-0" />
          <div className="flex flex-col">
            <span className="text-xs font-black uppercase tracking-wider">
              Documentação Validada com Sucesso
            </span>
            <span className="text-xs font-bold text-muted">
              Todos os dados obrigatórios foram devidamente preenchidos.
            </span>
          </div>
        </>
      ) : (
        <>
          <ShieldAlert className="size-5 text-warning-strong shrink-0" />
          <div className="flex flex-col">
            <span className="text-xs font-black uppercase tracking-wider">
              Documentação com Pendências
            </span>
            <span className="text-xs font-bold text-warning-strong/80">
              Preencha os campos obrigatórios (*). {Object.keys(errors).length}{" "}
              erro(s) listado(s).
            </span>
          </div>
        </>
      )}
    </div>
  );
}
