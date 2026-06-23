import { BarChart3, TrendingUp, Users, ArrowUpRight } from "lucide-react";

export function AgencyStatsPage() {
  return (
    <div className="mx-auto flex w-full max-w-[var(--layout-content-max)] flex-col gap-8 px-4 py-8 animate-fade-in">
      <div>
        <span className="text-[10px] font-black uppercase tracking-widest text-accent">
          Desempenho
        </span>
        <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary mt-1">
          Estatísticas da Rede
        </h1>
        <p className="text-muted text-sm font-semibold mt-1">
          Dados consolidados de conversões, tráfego e engajamento das suas
          lojas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="agency-card p-6 bg-gradient-to-br from-panel to-app-elevated flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-muted tracking-wider">
              Visualizações Totais
            </span>
            <h3 className="text-3xl font-black italic tracking-tighter mt-1 text-primary">
              124.502
            </h3>
            <p className="text-[10px] font-black text-green-end flex items-center gap-0.5 mt-2">
              <TrendingUp className="size-3" /> +14.2% este mês
            </p>
          </div>
          <div className="size-12 rounded-2xl bg-accent-soft text-accent flex items-center justify-center font-bold">
            <ArrowUpRight className="size-6" />
          </div>
        </div>

        <div className="agency-card p-6 bg-gradient-to-br from-panel to-app-elevated flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-muted tracking-wider">
              Leads Gerados
            </span>
            <h3 className="text-3xl font-black italic tracking-tighter mt-1 text-primary">
              3.840
            </h3>
            <p className="text-[10px] font-black text-green-end flex items-center gap-0.5 mt-2">
              <TrendingUp className="size-3" /> +8.7% este mês
            </p>
          </div>
          <div className="size-12 rounded-2xl bg-blue-soft text-blue-start flex items-center justify-center font-bold">
            <Users className="size-6" />
          </div>
        </div>

        <div className="agency-card p-6 bg-gradient-to-br from-panel to-app-elevated flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-muted tracking-wider">
              Conversão Média
            </span>
            <h3 className="text-3xl font-black italic tracking-tighter mt-1 text-primary">
              3.1%
            </h3>
            <p className="text-[10px] font-black text-green-end flex items-center gap-0.5 mt-2">
              <TrendingUp className="size-3" /> +0.4% este mês
            </p>
          </div>
          <div className="size-12 rounded-2xl bg-violet-500/10 text-violet-start flex items-center justify-center font-bold">
            <BarChart3 className="size-6" />
          </div>
        </div>
      </div>

      <div className="agency-card p-10 text-center flex flex-col items-center">
        <div className="size-16 bg-accent-soft text-accent rounded-3xl flex items-center justify-center mb-6">
          <BarChart3 className="size-8" />
        </div>
        <h3 className="text-xl font-black text-primary mb-2">
          Painel de Métricas Avançado
        </h3>
        <p className="text-muted text-xs font-semibold max-w-md mx-auto">
          Estamos portando a tela de estatísticas para a versão V2. Em breve
          você terá filtros interativos de tráfego, lead events e funis de
          vendas consolidados.
        </p>
      </div>
    </div>
  );
}
