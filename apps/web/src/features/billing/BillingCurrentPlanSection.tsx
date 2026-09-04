import { ArrowDownRight, Check, CheckCircle2, ShieldCheck } from "lucide-react";
import {
  money,
  planCapabilityHighlights,
  planLimitHighlights,
} from "./billingFormat";
import type { BillingOverview, BillingPlan } from "./types";

export function BillingCurrentPlanSection({
  freeChangeDisabled = false,
  onScheduleFree,
  overview,
  plan,
}: {
  freeChangeDisabled?: boolean;
  onScheduleFree?: () => void;
  overview: BillingOverview;
  plan: BillingPlan | null;
}) {
  const rawPlanName =
    overview.effectiveContract?.planName ??
    overview.subscription?.plan?.name ??
    plan?.name ??
    "Free";
  const planName = rawPlanName === "Free" ? "Grátis" : rawPlanName;
  const monthlyPriceCents =
    overview.effectiveContract?.unitAmountCents ??
    overview.subscription?.plan?.monthlyPriceCents ??
    plan?.monthlyPriceCents ??
    0;
  const capabilities = plan ? planCapabilityHighlights(plan, null) : [];
  const limits = plan ? planLimitHighlights(plan) : [];

  return (
    <section
      aria-label="Seu plano atual"
      className="overflow-hidden rounded-3xl border border-success-subtle bg-success-soft/40"
    >
      <div className="flex flex-col gap-5 border-b border-success-subtle p-6 md:flex-row md:items-center md:justify-between md:p-8">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-success-strong text-success-strong-foreground">
            <ShieldCheck aria-hidden="true" className="size-6" />
          </span>
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-success-strong">
              Seu plano atual
            </span>
            <div className="mt-1 flex flex-wrap items-center gap-2.5">
              <h2 className="text-2xl font-black tracking-tight text-foreground md:text-3xl">
                {planName}
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full border border-success-subtle bg-app-surface px-2.5 py-1 text-xs font-extrabold text-success-strong">
                <CheckCircle2 aria-hidden="true" className="size-3.5" />
                Ativo agora
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold text-muted">
              Estes são os limites e recursos disponíveis para sua loja neste
              momento.
            </p>
          </div>
        </div>
        <div className="md:text-right">
          <span className="text-xs font-black uppercase tracking-widest text-muted">
            Valor vigente
          </span>
          <p className="mt-1 text-2xl font-black tracking-tight text-foreground">
            {monthlyPriceCents === 0 ? "Sem custo" : money(monthlyPriceCents)}
            {monthlyPriceCents > 0 ? (
              <span className="ml-1 text-xs font-extrabold text-muted">
                /mês
              </span>
            ) : null}
          </p>
          {onScheduleFree ? (
            <button
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-extrabold text-muted underline-offset-4 transition-colors hover:text-foreground hover:underline disabled:cursor-not-allowed disabled:opacity-50"
              disabled={freeChangeDisabled}
              onClick={onScheduleFree}
              type="button"
            >
              <ArrowDownRight aria-hidden="true" className="size-3.5" />
              Agendar mudança para Grátis
            </button>
          ) : null}
        </div>
      </div>

      {plan ? (
        <div className="grid gap-6 p-6 md:p-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-foreground">
              Limites incluídos
            </h3>
            <div className="mt-3 space-y-2.5">
              {limits.map((limit) => (
                <div
                  className="flex items-start gap-2.5 rounded-xl border border-line/60 bg-app-surface/70 px-3.5 py-3 text-sm font-bold text-foreground"
                  key={limit}
                >
                  <CheckCircle2
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-success-strong"
                  />
                  <span>{limit}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-foreground">
              Recursos ativos
            </h3>
            <div className="mt-3 grid gap-x-5 gap-y-3 sm:grid-cols-2">
              {capabilities.map((capability, index) => (
                <div
                  className="flex items-start gap-2.5 text-sm font-semibold text-foreground"
                  key={`${capability}-${index}`}
                >
                  <Check
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0 text-success-strong"
                  />
                  <span>{capability}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="p-6 text-sm font-semibold text-muted md:p-8">
          Os detalhes do contrato estão sendo atualizados. O acesso efetivo
          continua preservado.
        </p>
      )}
    </section>
  );
}
