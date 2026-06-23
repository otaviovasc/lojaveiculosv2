import { CreditCard, ShieldCheck, DollarSign, Calendar } from "lucide-react";

export function AgencyBillingPage() {
  return (
    <div className="mx-auto flex w-full max-w-[var(--layout-content-max)] flex-col gap-8 px-4 py-8 animate-fade-in">
      <div>
        <span className="text-[10px] font-black uppercase tracking-widest text-accent">
          Financeiro
        </span>
        <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary mt-1">
          Cobrança Unificada
        </h1>
        <p className="text-muted text-sm font-semibold mt-1">
          Gerencie seu plano de agência, alocações de faturas e pagamentos
          corporativos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="agency-card p-6 bg-gradient-to-br from-panel to-app-elevated flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-muted tracking-wider">
              Recorrência Mensal
            </span>
            <h3 className="text-3xl font-black italic tracking-tighter mt-1 text-primary">
              R$ 2.490,00
            </h3>
          </div>
          <div className="size-12 rounded-2xl bg-accent-soft text-accent flex items-center justify-center font-bold">
            <DollarSign className="size-6" />
          </div>
        </div>

        <div className="agency-card p-6 bg-gradient-to-br from-panel to-app-elevated flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-muted tracking-wider">
              Status Assinatura
            </span>
            <h3 className="text-3xl font-black italic tracking-tighter mt-1 text-green-end">
              ATIVA
            </h3>
          </div>
          <div className="size-12 rounded-2xl bg-green-500/10 text-green-500 flex items-center justify-center font-bold">
            <ShieldCheck className="size-6" />
          </div>
        </div>

        <div className="agency-card p-6 bg-gradient-to-br from-panel to-app-elevated flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-muted tracking-wider">
              Próximo Vencimento
            </span>
            <h3 className="text-3xl font-black italic tracking-tighter mt-1 text-primary">
              10/07/2026
            </h3>
          </div>
          <div className="size-12 rounded-2xl bg-blue-soft text-blue-start flex items-center justify-center font-bold">
            <Calendar className="size-6" />
          </div>
        </div>
      </div>

      <div className="agency-card p-10 text-center flex flex-col items-center">
        <div className="size-16 bg-accent-soft text-accent rounded-3xl flex items-center justify-center mb-6">
          <CreditCard className="size-8" />
        </div>
        <h3 className="text-xl font-black text-primary mb-2">
          Painel de Assinatura Corporativa
        </h3>
        <p className="text-muted text-xs font-semibold max-w-md mx-auto">
          Gerencie e distribua limites de concessionárias, veja faturas passadas
          geradas pelo Asaas e configure o cartão de crédito corporativo para
          cobranças centralizadas.
        </p>
      </div>
    </div>
  );
}
