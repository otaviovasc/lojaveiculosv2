import {
  Bot,
  CircleStop,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import AnimatedContent from "../../components/ui/AnimatedContent";
import { FeatureCard } from "../../components/ui/FeatureCards";

type AutomationMetrics = {
  approved: number;
  awaiting: number;
  blocked: number;
  loaded: number;
  total: number;
};

export function AutomationWorkspaceMetrics({
  metrics,
}: {
  metrics: AutomationMetrics;
}) {
  const detail =
    metrics.loaded < metrics.total
      ? `entre ${metrics.loaded} carregadas`
      : undefined;
  return (
    <section className="automation-metrics" aria-label="Resumo das automações">
      <AutomationMetricCard
        animationIndex={0}
        icon={Bot}
        label="Prévias no total"
        tone="info"
        value={metrics.total}
      />
      <AutomationMetricCard
        animationIndex={1}
        detail={detail}
        icon={Sparkles}
        label="Aguardando revisão"
        value={metrics.awaiting}
        tone="warning"
      />
      <AutomationMetricCard
        animationIndex={2}
        detail={detail}
        icon={ShieldCheck}
        label="Planos aprovados"
        value={metrics.approved}
        tone="success"
      />
      <AutomationMetricCard
        animationIndex={3}
        detail={detail}
        icon={CircleStop}
        label="Bloqueadas"
        value={metrics.blocked}
        tone="danger"
      />
    </section>
  );
}

export function AutomationMetricCard({
  animationIndex = 0,
  detail,
  icon: Icon,
  label,
  tone = "neutral",
  value,
}: {
  animationIndex?: number;
  detail?: string | undefined;
  icon: LucideIcon;
  label: string;
  tone?: "danger" | "info" | "neutral" | "success" | "warning";
  value: number;
}) {
  return (
    <AnimatedContent
      delay={animationIndex * 0.055}
      distance={12}
      duration={0.38}
      trigger="mount"
    >
      <FeatureCard className="automation-metric" data-tone={tone}>
        <span className="automation-metric-icon">
          <Icon aria-hidden="true" className="size-4" />
        </span>
        <span>
          <strong>{value}</strong>
          <small>{label}</small>
          {detail ? (
            <span className="automation-metric-detail">{detail}</span>
          ) : null}
        </span>
      </FeatureCard>
    </AnimatedContent>
  );
}
