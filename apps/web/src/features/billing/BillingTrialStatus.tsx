import { CalendarClock, Check, Sparkles, TriangleAlert } from "lucide-react";
import { featureLabels } from "./billingFormat";
import type { BillingOverview } from "./types";

export function BillingTrialStatus({
  onCta,
  overview,
}: {
  onCta?: (() => void) | undefined;
  overview: BillingOverview;
}) {
  const subscription = overview.subscription;
  if (!subscription || subscription.status === "active") return null;
  const isTrial = subscription.status === "trialing";
  const trialFeatures = overview.entitlements.filter(
    (entitlement) => entitlement.status === "trialing",
  );

  return (
    <section
      className={`billing-trial-state ${isTrial ? "is-trial" : "is-expired"}`}
    >
      <div className="billing-trial-state-icon" aria-hidden="true">
        {isTrial ? <Sparkles /> : <TriangleAlert />}
      </div>
      <div className="billing-trial-state-copy">
        <span>{isTrial ? "Teste gratuito" : "Teste encerrado"}</span>
        <h2>
          {isTrial
            ? `${daysUntil(subscription.currentPeriodEnd) ?? 0} dias para explorar sua operação`
            : "Escolha sua assinatura para continuar"}
        </h2>
        <p>
          {isTrial
            ? "Assine agora para garantir seu plano — a cobrança é feita na hora, no cartão. Você confere o valor no checkout Asaas antes de concluir."
            : "Os acessos gratuitos expiraram. Revise o plano, escolha os pacotes e conclua a primeira cobrança."}
        </p>
        {isTrial ? (
          <div className="billing-trial-features">
            {trialFeatures.map((entitlement) => (
              <span key={entitlement.featureKey}>
                <Check aria-hidden="true" />
                {featureLabels[entitlement.featureKey]}
              </span>
            ))}
          </div>
        ) : null}
        {onCta ? (
          <button className="billing-trial-cta" onClick={onCta} type="button">
            Assinar agora
          </button>
        ) : null}
      </div>
      <div className="billing-trial-deadline">
        <CalendarClock aria-hidden="true" />
        <span>{isTrial ? "Termina em" : "Terminou em"}</span>
        <strong>{dateLabel(subscription.currentPeriodEnd)}</strong>
      </div>
    </section>
  );
}

function daysUntil(value: string | null) {
  if (!value) return null;
  return Math.max(
    0,
    Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000),
  );
}

function dateLabel(value: string | null) {
  if (!value) return "Data a confirmar";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}
