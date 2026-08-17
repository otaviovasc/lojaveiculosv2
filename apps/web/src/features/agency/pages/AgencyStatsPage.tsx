import {
  BarChart3,
  CheckCircle2,
  CircleGauge,
  DatabaseZap,
  ShieldCheck,
} from "lucide-react";
import {
  FeaturePageHeader,
  FeaturePageShell,
} from "../../../components/ui/FeatureLayout";

const metricRequirements = [
  {
    description: "Eventos identificados por loja, origem e campanha.",
    icon: DatabaseZap,
    label: "Aquisição e tráfego",
  },
  {
    description: "Leads e etapas comerciais conectados ao mesmo funil.",
    icon: CircleGauge,
    label: "Conversão comercial",
  },
  {
    description: "Indicadores publicados somente após validação da fonte.",
    icon: ShieldCheck,
    label: "Qualidade dos dados",
  },
] as const;

export function AgencyStatsPage() {
  return (
    <FeaturePageShell
      className="agency-stats-page relative animate-fade-in"
      variant="content"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-1/4 top-0 h-[300px] w-[500px] rounded-full bg-accent-strong/15 blur-[120px]"
      />
      <div className="relative z-10 space-y-6">
        <FeaturePageHeader
          chip="Em preparação"
          description="Métricas consolidadas serão exibidas somente quando as fontes de cada loja estiverem conectadas e validadas."
          eyebrow={
            <>
              <BarChart3 aria-hidden="true" className="size-4" />
              Desempenho da rede
            </>
          }
          title="Estatísticas"
        />

        <section
          aria-labelledby="agency-stats-unavailable-title"
          className="agency-stats-unavailable"
        >
          <div className="agency-stats-unavailable__visual" aria-hidden="true">
            <BarChart3 />
            <span />
            <span />
            <span />
          </div>

          <div className="agency-stats-unavailable__copy">
            <span className="agency-stats-status">
              <CheckCircle2 aria-hidden="true" />
              Sem dados estimados
            </span>
            <h2 id="agency-stats-unavailable-title">
              Painel avançado em preparação
            </h2>
            <p>
              Ainda não há uma fonte analítica real conectada a esta tela. Por
              isso, nenhum total, percentual ou tendência fictícia é
              apresentado.
            </p>
          </div>

          <div className="agency-stats-requirements">
            {metricRequirements.map(({ description, icon: Icon, label }) => (
              <article key={label}>
                <span aria-hidden="true">
                  <Icon />
                </span>
                <div>
                  <h3>{label}</h3>
                  <p>{description}</p>
                </div>
              </article>
            ))}
          </div>

          <p className="agency-stats-footnote" role="status">
            Os primeiros números aparecerão aqui depois que a coleta, a janela
            de comparação e a validação de eventos estiverem operacionais.
          </p>
        </section>
      </div>
    </FeaturePageShell>
  );
}
