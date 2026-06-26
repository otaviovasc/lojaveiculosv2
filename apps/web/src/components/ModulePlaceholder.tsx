import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  DatabaseZap,
  ShieldCheck,
} from "lucide-react";
import type { ModuleDefinition } from "../app/modules";
import {
  FeatureActionButton,
  FeaturePageHeader,
  FeaturePageShell,
  FeatureSection,
} from "./ui/FeatureLayout";

const readinessItems = [
  "Permissoes e modulos definidos antes da liberacao",
  "Estados vazios, carregando, erro e bloqueado previstos",
  "Historico por loja, usuario e acao",
];

export function ModulePlaceholder({ module }: { module: ModuleDefinition }) {
  return (
    <FeaturePageShell variant="content">
      <FeaturePageHeader
        actions={
          <FeatureActionButton
            icon={ArrowRight}
            label={module.action}
            variant="primary"
          />
        }
        description={module.description}
        eyebrow={module.eyebrow}
        title={module.title}
      />

      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <FeatureSection className="p-5 lg:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="addon-icon addon-icon-green">
              <DatabaseZap aria-hidden="true" className="size-5" />
            </div>
            <div>
              <p className="eyebrow">Modulo em preparo</p>
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
        </FeatureSection>

        <FeatureSection className="p-5">
          <p className="eyebrow">Proximo passo</p>
          <div className="mt-4 space-y-4">
            <div className="flex gap-3">
              <Clock3
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-accent"
              />
              <p className="text-sm font-semibold text-muted">
                Conectar dados reais quando o fluxo operacional estiver pronto.
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
        </FeatureSection>
      </section>
    </FeaturePageShell>
  );
}
