import { Clock, AlertTriangle, ArrowRight, Check } from "lucide-react";
import { cn } from "../../lib/utils";
import { featureLabels } from "./billingFormat";
import type { BillingOverview } from "./types";

export function BillingTrialStatus({
  onCta,
  overview,
}: {
  onCta?: (() => void) | undefined;
  overview: BillingOverview;
}) {
  const isExpired = overview.subscription?.status === "expired";
  const trialEntitlements = overview.entitlements.filter(
    (e) => e.status === "trialing" || e.status === "active",
  );

  return (
    <article className="billing-trial-status p-5 rounded-2xl border border-line bg-app-elevated shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "size-10 rounded-xl flex items-center justify-center",
              isExpired
                ? "bg-danger-soft text-danger"
                : "bg-warning-soft text-warning-strong",
            )}
          >
            {isExpired ? (
              <AlertTriangle className="size-5" aria-hidden="true" />
            ) : (
              <Clock className="size-5" aria-hidden="true" />
            )}
          </div>

          <div>
            <h3 className="text-lg font-black text-foreground">
              {isExpired ? "Teste encerrado" : "Teste gratuito"}
            </h3>
            <p className="text-xs text-muted font-medium mt-0.5">
              {isExpired
                ? "Escolha sua assinatura para continuar aproveitando os recursos da loja. Esta será sua primeira cobrança."
                : "Assine agora para garantir seu plano sem interrupção. Ao confirmar, a cobrança é feita na hora."}
            </p>
          </div>
        </div>

        {onCta ? (
          <button
            className="px-4 py-2 text-xs font-black bg-accent-strong text-accent-strong-foreground rounded-xl flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition-all shrink-0"
            onClick={onCta}
            type="button"
          >
            Assinar agora
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {trialEntitlements.length ? (
        <div className="pt-3 border-t border-line/60 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-muted">Recursos em uso:</span>
          {trialEntitlements.map((ent) => (
            <span
              key={ent.featureKey}
              className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-app-surface border border-line text-foreground"
            >
              <Check
                className="size-3 text-success-strong"
                aria-hidden="true"
              />
              {featureLabels[ent.featureKey] ?? ent.featureKey}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}
