import { Info, ShieldCheck } from "lucide-react";

export function DocumentosRenaveCard() {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-line bg-panel p-5">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <h3 className="flex items-center gap-1.5 text-sm font-black uppercase tracking-wider">
          <ShieldCheck className="size-4 shrink-0 text-muted" />
          <span>Fluxo RENAVE</span>
        </h3>
        <span className="rounded-full border border-line bg-app px-2 py-0.5 text-xs font-black text-muted">
          Indisponível
        </span>
      </div>

      <div className="flex gap-2 rounded-xl border border-line bg-app-elevated/40 p-3 text-xs font-bold leading-relaxed text-muted">
        <Info className="mt-0.5 size-3.5 shrink-0 text-accent" />
        <p>
          Ainda não existe integração RENAVE vinculada ao cadastro do veículo.
          Código, etapas e conclusão só serão exibidos depois que o backend
          consultar e persistir o processo oficial.
        </p>
      </div>
    </section>
  );
}
