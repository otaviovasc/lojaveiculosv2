import { dashboardPanels, dashboardStats } from "../app/dashboardData";
import { LockedAddonPanel } from "./LockedAddonPanel";
import { StatCard } from "./StatCard";

export function DashboardHome() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:px-6 lg:py-8">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="panel p-5 lg:p-6">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-widest text-muted">
              Operacao
            </p>
            <h2 className="text-xl font-black">Fila de decisoes do dia</h2>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {dashboardPanels.map((panel) => {
              const Icon = panel.icon;

              return (
                <article className="rounded-lg bg-app p-4" key={panel.label}>
                  <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-panel text-accent">
                    <Icon aria-hidden="true" className="size-5" />
                  </div>
                  <h3 className="font-black">{panel.label}</h3>
                  <p className="mt-2 text-sm font-semibold text-muted">
                    {panel.text}
                  </p>
                </article>
              );
            })}
          </div>
        </div>

        <div className="panel p-5 lg:p-6">
          <p className="text-xs font-black uppercase tracking-widest text-muted">
            V2 guardrails
          </p>
          <h2 className="mt-1 text-xl font-black">Sem degradacao escondida</h2>
          <p className="mt-3 text-sm font-semibold text-muted">
            Cada modulo precisa de inventario, permissao, auditoria, logs
            escopados, estados visuais completos e plano de migracao antes de
            substituir o fluxo V1.
          </p>
        </div>
      </section>

      <LockedAddonPanel kind="crm" />
    </main>
  );
}
