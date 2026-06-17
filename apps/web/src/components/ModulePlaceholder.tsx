import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  DatabaseZap,
  ShieldCheck,
} from "lucide-react";
import type { ModuleDefinition } from "../app/modules";

const readinessItems = [
  "Permissoes e entitlements definidos antes do rollout",
  "Estados vazios, carregando, erro e bloqueado previstos",
  "Auditoria, logs escopados e tenant/store id em cada acao",
];

export function ModulePlaceholder({ module }: { module: ModuleDefinition }) {
  return (
    <main className="content-frame">
      <section className="module-hero">
        <div className="min-w-0">
          <p className="eyebrow">{module.eyebrow}</p>
          <h2 className="mt-2 text-2xl font-black md:text-4xl">
            {module.title}
          </h2>
          <p className="mt-3 max-w-2xl text-sm font-semibold text-muted md:text-base">
            {module.description}
          </p>
        </div>

        <button className="primary-button" type="button">
          <span>{module.action}</span>
          <ArrowRight aria-hidden="true" className="size-4" />
        </button>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="panel p-5 lg:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="addon-icon addon-icon-green">
              <DatabaseZap aria-hidden="true" className="size-5" />
            </div>
            <div>
              <p className="eyebrow">Contrato de modulo</p>
              <h3 className="text-xl font-black">Fundacao pronta</h3>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {readinessItems.map((item) => (
              <article className="status-tile" key={item}>
                <CheckCircle2
                  aria-hidden="true"
                  className="size-4 shrink-0 text-accent"
                />
                <p className="text-sm font-bold">{item}</p>
              </article>
            ))}
          </div>
        </div>

        <aside className="panel p-5">
          <p className="eyebrow">Proximo passo</p>
          <div className="mt-4 space-y-4">
            <div className="flex gap-3">
              <Clock3
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-accent"
              />
              <p className="text-sm font-semibold text-muted">
                Conectar dados reais quando os contratos de servico estiverem
                estaveis.
              </p>
            </div>
            <div className="flex gap-3">
              <ShieldCheck
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-accent"
              />
              <p className="text-sm font-semibold text-muted">
                Manter o modulo isolado ate as regras de acesso e auditoria
                passarem pelos testes.
              </p>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
