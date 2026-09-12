import { Check, CheckCircle2, RefreshCcw, Sparkles } from "lucide-react";
import {
  FeatureDialog,
  FeatureDialogActions,
} from "../../components/ui/FeatureOverlay";
import { planCapabilityHighlights, planLimitHighlights } from "./billingFormat";
import type { BillingOverview, BillingPlan, BillingPlanHire } from "./types";

export type BillingActivationSuccess = {
  hire: BillingPlanHire;
  plan: BillingPlan | null;
  previousPlan: BillingPlan | null;
  sessionRefreshed: boolean;
};

export function BillingActivationSuccessDialog({
  activation,
  onDismiss,
}: {
  activation: BillingActivationSuccess;
  onDismiss: () => void;
}) {
  const planName = activation.plan?.name ?? activation.hire.planSnapshot.name;
  const allHighlights = activation.plan
    ? newCapabilityHighlights(activation.plan, activation.previousPlan)
    : [];
  const visibleHighlights = allHighlights.slice(0, 6);
  const remainingHighlights = allHighlights.length - visibleHighlights.length;
  const limits = activation.plan ? planLimitHighlights(activation.plan) : [];
  const dismiss = (reload: boolean) => {
    markBillingActivationSeen(activation.hire);
    onDismiss();
    if (reload && !activation.sessionRefreshed) window.location.reload();
  };

  return (
    <FeatureDialog
      description={`O pagamento foi confirmado e o plano ${planName} já é o contrato efetivo desta loja.`}
      footer={
        <FeatureDialogActions
          cancelLabel="Fechar"
          confirmIcon={
            activation.sessionRefreshed ? (
              <Sparkles aria-hidden="true" />
            ) : (
              <RefreshCcw aria-hidden="true" />
            )
          }
          confirmLabel={
            activation.sessionRefreshed
              ? "Explorar recursos"
              : "Atualizar e explorar"
          }
          onCancel={() => dismiss(false)}
          onConfirm={() => dismiss(true)}
        />
      }
      icon={<CheckCircle2 className="text-success-strong" />}
      isOpen
      onClose={() => dismiss(false)}
      title={`Plano ${planName} ativado`}
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-success-subtle bg-success-soft p-4">
          <p className="flex items-center gap-2 text-sm font-black text-success-strong">
            <CheckCircle2 aria-hidden="true" className="size-4" />
            Assinatura ativa
          </p>
          <p className="mt-1 text-xs font-bold leading-relaxed text-muted">
            Os recursos estão disponíveis conforme as permissões de cada usuário
            da loja.
          </p>
        </div>

        {visibleHighlights.length ? (
          <section aria-labelledby="billing-activation-resources">
            <h4
              className="text-xs font-black uppercase tracking-widest text-accent-strong"
              id="billing-activation-resources"
            >
              Principais recursos liberados
            </h4>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {visibleHighlights.map((highlight) => (
                <li
                  className="flex items-start gap-2 rounded-xl border border-line bg-app-elevated p-3 text-xs font-bold text-foreground"
                  key={highlight}
                >
                  <Check
                    aria-hidden="true"
                    className="mt-0.5 size-3.5 shrink-0 text-success-strong"
                  />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
            {remainingHighlights > 0 ? (
              <p className="mt-2 text-xs font-bold text-muted">
                + {remainingHighlights} outros recursos incluídos no plano.
              </p>
            ) : null}
          </section>
        ) : null}

        {limits.length ? (
          <section aria-labelledby="billing-activation-limits">
            <h4
              className="text-xs font-black uppercase tracking-widest text-accent-strong"
              id="billing-activation-limits"
            >
              Limites mensais e operacionais
            </h4>
            <ul className="mt-2 space-y-1 text-xs font-bold text-muted">
              {limits.map((limit) => (
                <li key={limit}>• {limit}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {!activation.sessionRefreshed ? (
          <p className="rounded-xl border border-warning-subtle bg-warning-soft p-3 text-xs font-bold text-warning-strong">
            O plano está ativo, mas o menu não conseguiu sincronizar nesta
            tentativa. Use “Atualizar e explorar” para carregar os novos
            acessos.
          </p>
        ) : null}
      </div>
    </FeatureDialog>
  );
}

export function billingActivationSeen(hire: BillingPlanHire) {
  try {
    return window.localStorage.getItem(activationStorageKey(hire)) === "seen";
  } catch {
    return false;
  }
}

export function markBillingActivationSeen(hire: BillingPlanHire) {
  try {
    window.localStorage.setItem(activationStorageKey(hire), "seen");
  } catch {
    // The current mount still dismisses the dialog when storage is unavailable.
  }
}

export function resolveBillingActivationSuccess(
  hire: BillingPlanHire,
  previousOverview: BillingOverview | null,
  overview: BillingOverview,
  sessionRefreshed: boolean,
): BillingActivationSuccess | null {
  if (hire.quotedCents <= 0 || billingActivationSeen(hire)) return null;
  const previousPlanId =
    previousOverview?.effectiveContract?.planId ??
    previousOverview?.subscription?.plan?.id ??
    previousOverview?.plans.find((plan) => plan.code === "free")?.id ??
    null;
  return {
    hire,
    plan: overview.plans.find((plan) => plan.id === hire.planId) ?? null,
    previousPlan:
      overview.plans.find((plan) => plan.id === previousPlanId) ?? null,
    sessionRefreshed,
  };
}

function newCapabilityHighlights(
  plan: BillingPlan,
  previousPlan: BillingPlan | null,
) {
  const incremental = planCapabilityHighlights(plan, previousPlan).filter(
    (highlight) => !highlight.startsWith("Tudo do "),
  );
  return incremental.length
    ? incremental
    : planCapabilityHighlights(plan, null);
}

function activationStorageKey(hire: BillingPlanHire) {
  return `lojaveiculos.billing.activation-seen.${hire.tenantId}.${hire.storeId}.${hire.id}`;
}
