import { CircleAlert, ShieldCheck } from "lucide-react";

const renaveSteps = ["Entrada", "Intenção", "Autorização", "Conclusão"];

export function DocumentosRenaveCard() {
  return (
    <section
      aria-labelledby="renave-card-title"
      className="flex flex-col gap-4 rounded-2xl border border-line bg-panel p-5"
    >
      <header className="flex items-center justify-between gap-3 border-b border-line pb-3">
        <h3
          className="flex items-center gap-1.5 text-sm font-black uppercase tracking-wider"
          id="renave-card-title"
        >
          <ShieldCheck className="size-4 shrink-0 text-muted" />
          Fluxo RENAVE
        </h3>
        <span className="rounded-full border border-line bg-app px-2 py-0.5 text-xs font-black text-muted">
          Indisponível
        </span>
      </header>

      <div className="rounded-xl border border-line bg-app p-4">
        <div className="flex items-start gap-3">
          <CircleAlert className="mt-0.5 size-5 shrink-0 text-warning" />
          <div className="grid gap-1.5">
            <span className="text-xs font-black uppercase tracking-wider text-muted">
              Não integrado
            </span>
            <strong className="text-sm text-app-text">
              Nenhuma operação foi enviada ao RENAVE
            </strong>
            <p className="text-xs font-semibold leading-5 text-muted">
              Ainda não existe integração RENAVE vinculada ao cadastro do
              veículo. Esta tela não possui conexão com uma integradora
              autorizada. Códigos, etapas e conclusão só serão exibidos depois
              que o backend consultar e persistir o processo oficial.
            </p>
          </div>
        </div>
      </div>

      <div aria-label="Etapas RENAVE indisponíveis" className="grid gap-2">
        <span className="text-xs font-black uppercase tracking-wider text-muted">
          Etapas indisponíveis
        </span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {renaveSteps.map((step) => (
            <span
              className="rounded-lg border border-line bg-app px-2 py-2 text-center text-xs font-bold text-muted"
              key={step}
            >
              {step}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
