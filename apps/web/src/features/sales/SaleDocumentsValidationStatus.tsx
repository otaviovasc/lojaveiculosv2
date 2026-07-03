import { CheckCircle2, ShieldAlert } from "lucide-react";

export function SaleDocumentsValidationStatus({
  errors,
  isValid,
}: {
  errors: Record<string, string>;
  isValid: boolean;
}) {
  const statusClassName = isValid
    ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-600"
    : "bg-amber-500/10 border-amber-500/25 text-amber-600";

  return (
    <div
      className={[
        "p-4 rounded-xl border flex items-center gap-3 transition-colors",
        statusClassName,
      ].join(" ")}
    >
      {isValid ? (
        <>
          <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />
          <div className="flex flex-col">
            <span className="text-xs font-black uppercase tracking-wider">
              Documentação Validada com Sucesso
            </span>
            <span className="text-xs font-bold text-emerald-500/80">
              Todos os dados obrigatórios foram devidamente preenchidos.
            </span>
          </div>
        </>
      ) : (
        <>
          <ShieldAlert className="size-5 text-amber-500 shrink-0" />
          <div className="flex flex-col">
            <span className="text-xs font-black uppercase tracking-wider">
              Documentação com Pendências
            </span>
            <span className="text-xs font-bold text-amber-500/80">
              Preencha os campos obrigatórios (*). {Object.keys(errors).length}{" "}
              erro(s) listado(s).
            </span>
          </div>
        </>
      )}
    </div>
  );
}
