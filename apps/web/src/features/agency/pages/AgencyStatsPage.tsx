import {
  BarChart3,
  CheckCircle2,
  CircleGauge,
  DatabaseZap,
  ShieldCheck,
} from "lucide-react";

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
    <div className="agency-stats-page animate-fade-in">
      <header className="agency-stats-header">
        <span>Desempenho da rede</span>
        <h1>Estatísticas</h1>
        <p>
          Métricas consolidadas serão exibidas somente quando as fontes de cada
          loja estiverem conectadas e validadas.
        </p>
      </header>

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
            isso, nenhum total, percentual ou tendência fictícia é apresentado.
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
          Os primeiros números aparecerão aqui depois que a coleta, a janela de
          comparação e a validação de eventos estiverem operacionais.
        </p>
      </section>
    </div>
  );
}
