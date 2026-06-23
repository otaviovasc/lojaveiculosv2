import type { ReactNode } from "react";
import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  Gem,
  Plus,
  SlidersHorizontal,
  Store,
} from "lucide-react";
import {
  AgencyDateFilter,
  AgencySearchFilter,
  AgencySelect,
  AgencyStatCard,
} from "./AgencyDashboardControlParts";
import type {
  AgencySort,
  AgencyStatusFilter,
  AgencyStore,
} from "./AgencyDashboardPage.model";

export type AgencyToastMessage = {
  type: "success" | "error";
  text: string;
};

export function AgencyToast({
  message,
}: {
  message: AgencyToastMessage | null;
}) {
  if (!message) return null;

  return (
    <div
      className={
        "fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl border text-sm font-bold animate-fade-in " +
        (message.type === "success"
          ? "bg-accent-soft text-accent border-accent/20"
          : "bg-danger/10 text-danger border-danger/20")
      }
    >
      {message.type === "success" ? (
        <CheckCircle2 className="size-5 shrink-0" />
      ) : (
        <AlertTriangle className="size-5 shrink-0" />
      )}
      <span>{message.text}</span>
    </div>
  );
}

export function AgencyDashboardHeader({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <span className="text-[10px] font-black uppercase tracking-widest text-accent">
          Visão Geral
        </span>
        <h1 className="text-3xl font-black italic uppercase tracking-tighter text-primary mt-1">
          Rede de Lojas
        </h1>
        <p className="text-muted text-sm font-semibold mt-1">
          Central de monitoramento, planos, acessos e faturamento das suas
          concessionárias.
        </p>
      </div>
      <button onClick={onCreate} className="btn-gradient">
        <Plus className="size-5" />
        <span>Criar Nova Loja</span>
      </button>
    </div>
  );
}

export function AgencyStatsGrid({ stores }: { stores: AgencyStore[] }) {
  const vehicleCount = stores.reduce(
    (acc, curr) => acc + (curr._count?.veiculos || 0),
    0,
  );
  const activeCount = stores.filter(
    (s) => s.status_assinatura === "ATIVA",
  ).length;
  const premiumCount = stores.filter(
    (s) => s.plano.includes("PREMIUM") || s.plano.includes("ENTERPRISE"),
  ).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <AgencyStatCard
        icon={<Store className="size-6" />}
        iconClass="bg-blue-soft text-blue-start"
        label="Total de Lojas"
        value={stores.length}
        valueClassName="text-primary"
      />
      <AgencyStatCard
        icon={<Briefcase className="size-6" />}
        iconClass="bg-accent-soft text-accent"
        label="Total de Veículos"
        value={vehicleCount}
        valueClassName="text-primary"
      />
      <AgencyStatCard
        icon={<CheckCircle2 className="size-6" />}
        iconClass="bg-green-500/10 text-green-500"
        label="Ativas"
        value={activeCount}
        valueClassName="text-green-end"
      />
      <AgencyStatCard
        icon={<Gem className="size-6" />}
        iconClass="bg-violet-500/10 text-violet-start"
        label="Planos Premium"
        value={premiumCount}
        valueClassName="text-violet-start"
      />
    </div>
  );
}

export function AgencyStoresCard({
  children,
  filteredCount,
  planEndDateFrom,
  planEndDateTo,
  searchTerm,
  sortBy,
  statusFilter,
  onPlanEndDateFromChange,
  onPlanEndDateToChange,
  onSearchTermChange,
  onSortByChange,
  onStatusFilterChange,
}: {
  children: ReactNode;
  filteredCount: number;
  planEndDateFrom: string;
  planEndDateTo: string;
  searchTerm: string;
  sortBy: AgencySort;
  statusFilter: AgencyStatusFilter;
  onPlanEndDateFromChange: (value: string) => void;
  onPlanEndDateToChange: (value: string) => void;
  onSearchTermChange: (value: string) => void;
  onSortByChange: (value: AgencySort) => void;
  onStatusFilterChange: (value: AgencyStatusFilter) => void;
}) {
  return (
    <div className="agency-card">
      <div className="p-6 border-b border-line bg-panel/50 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent-soft text-accent rounded-xl">
            <Store className="size-5" />
          </div>
          <h2 className="text-lg font-black uppercase italic tracking-wider text-primary">
            Nossas Lojas ({filteredCount})
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:flex xl:items-center gap-3 flex-1 xl:max-w-4xl justify-end">
          <AgencySearchFilter
            value={searchTerm}
            onChange={onSearchTermChange}
          />
          <AgencySelect
            icon={<SlidersHorizontal className="size-3.5" />}
            onChange={(value) => onSortByChange(value as AgencySort)}
            value={sortBy}
          >
            <option value="recent">Mais Recentes</option>
            <option value="oldest">Mais Antigas</option>
            <option value="alphabetical">Ordem A-Z</option>
            <option value="vehicles">Mais Estoque</option>
            <option value="status">Por Status</option>
          </AgencySelect>
          <AgencySelect
            icon={<SlidersHorizontal className="size-3.5" />}
            onChange={(value) =>
              onStatusFilterChange(value as AgencyStatusFilter)
            }
            value={statusFilter}
          >
            <option value="all">Todos Status</option>
            <option value="active">Ativas</option>
            <option value="expiring">Vencem em Breve</option>
            <option value="expired">Expiradas</option>
            <option value="inactive">Inativas</option>
          </AgencySelect>
          <AgencyDateFilter
            from={planEndDateFrom}
            onFromChange={onPlanEndDateFromChange}
            onToChange={onPlanEndDateToChange}
            to={planEndDateTo}
          />
        </div>
      </div>
      {children}
    </div>
  );
}
