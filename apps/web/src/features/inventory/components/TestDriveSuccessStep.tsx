import { CheckCircle2 } from "lucide-react";

export function TestDriveSuccessStep() {
  return (
    <div className="text-center py-10 space-y-4 text-app-text">
      <div className="size-16 rounded-full bg-accent-soft text-accent-strong flex items-center justify-center mx-auto shadow-inner">
        <CheckCircle2 className="size-9" />
      </div>
      <div>
        <h3 className="text-xl font-black">Test Drive Registrado!</h3>
        <p className="text-sm text-muted mt-1 max-w-sm mx-auto">
          O registro do test drive foi concluído com sucesso. Você pode
          visualizar e imprimir o termo agora.
        </p>
      </div>
    </div>
  );
}
