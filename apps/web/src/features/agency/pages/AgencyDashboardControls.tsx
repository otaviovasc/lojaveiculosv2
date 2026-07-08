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
  FeatureSearchField,
  FeatureSelect,
} from "../../../components/ui/FeatureControls";
import {
  FeatureActionButton,
  FeaturePageHeader,
} from "../../../components/ui/FeatureLayout";
import { FeatureStatCard } from "../../../components/ui/FeatureCards";
import { AgencyDateFilter } from "./AgencyDashboardControlParts";
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
    <FeaturePageHeader
      actions={
        <FeatureActionButton
          icon={Plus}
          label="Criar Nova Loja"
          onClick={onCreate}
          variant="primary"
        />
      }
      description="Central de monitoramento, planos e faturamento das suas concessionarias."
      eyebrow="Visao Geral"
      title="Rede de Lojas"
    />
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
      <FeatureStatCard
        icon={Store}
        label="Total de Lojas"
        tone="blue"
        value={stores.length}
      />
      <FeatureStatCard
        icon={Briefcase}
        label="Total de Veículos"
        tone="accent"
        value={vehicleCount}
      />
      <FeatureStatCard
        icon={CheckCircle2}
        label="Ativas"
        tone="green"
        value={activeCount}
      />
      <FeatureStatCard
        icon={Gem}
        label="Planos Premium"
        tone="violet"
        value={premiumCount}
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
          <FeatureSearchField
            label="Buscar loja ou subdominio"
            placeholder="Buscar loja ou subdominio..."
            inputClassName="rounded-xl"
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
          />
          <FeatureSelect
            leftIcon={<SlidersHorizontal className="size-3.5" />}
            onChange={(value) => onSortByChange(value as AgencySort)}
            options={[
              { label: "Mais Recentes", value: "recent" },
              { label: "Mais Antigas", value: "oldest" },
              { label: "Ordem A-Z", value: "alphabetical" },
              { label: "Mais Estoque", value: "vehicles" },
              { label: "Por Status", value: "status" },
            ]}
            value={sortBy}
          />
          <FeatureSelect
            leftIcon={<SlidersHorizontal className="size-3.5" />}
            onChange={(value) =>
              onStatusFilterChange(value as AgencyStatusFilter)
            }
            options={[
              { label: "Todos Status", value: "all" },
              { label: "Ativas", value: "active" },
              { label: "Vencem em Breve", value: "expiring" },
              { label: "Expiradas", value: "expired" },
              { label: "Inativas", value: "inactive" },
            ]}
            value={statusFilter}
          />
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
