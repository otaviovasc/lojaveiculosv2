import type { ReactNode } from "react";
import {
  Briefcase,
  CheckCircle2,
  Gem,
  LayoutDashboard,
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
import { AgencyDateFilter } from "./AgencyDashboardControlParts";
import type {
  AgencySort,
  AgencyStatusFilter,
  AgencyStore,
} from "./AgencyDashboardPage.model";

export function AgencyDashboardHeader({
  storeCount,
  onCreate,
}: {
  storeCount: number;
  onCreate: () => void;
}) {
  return (
    <FeaturePageHeader
      actions={
        <FeatureActionButton
          icon={Plus}
          label="Criar nova loja"
          onClick={onCreate}
          variant="primary"
        />
      }
      chip={
        storeCount > 0
          ? `${storeCount} ${storeCount === 1 ? "loja na rede" : "lojas na rede"}`
          : undefined
      }
      description="Central de monitoramento, planos e faturamento das suas concessionárias."
      eyebrow={
        <>
          <LayoutDashboard aria-hidden="true" className="size-4" />
          Visão geral
        </>
      }
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

  const kpis = [
    {
      icon: Store,
      label: "Total de lojas",
      tone: "accent",
      value: stores.length,
    },
    {
      icon: Briefcase,
      label: "Total de veículos",
      tone: "info",
      value: vehicleCount,
    },
    {
      icon: CheckCircle2,
      label: "Ativas",
      tone: "success",
      value: activeCount,
    },
    {
      icon: Gem,
      label: "Planos premium",
      tone: "warning",
      value: premiumCount,
    },
  ] as const;

  return (
    <section aria-label="Indicadores da rede" className="agency-kpi-grid">
      {kpis.map(({ icon: Icon, label, tone, value }) => (
        <article
          className={`agency-kpi-card agency-kpi-card--${tone}`}
          key={label}
        >
          <span aria-hidden="true" className="agency-kpi-card__watermark">
            <Icon />
          </span>
          <div className="agency-kpi-card__info">
            <small>{label}</small>
            <strong>{value}</strong>
          </div>
        </article>
      ))}
    </section>
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
            label="Buscar loja ou subdomínio"
            placeholder="Buscar loja ou subdomínio..."
            inputClassName="rounded-xl"
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
          />
          <FeatureSelect
            leftIcon={<SlidersHorizontal className="size-3.5" />}
            onChange={(value) => onSortByChange(value as AgencySort)}
            options={[
              { label: "Mais recentes", value: "recent" },
              { label: "Mais antigas", value: "oldest" },
              { label: "Ordem A-Z", value: "alphabetical" },
              { label: "Mais estoque", value: "vehicles" },
              { label: "Por status", value: "status" },
            ]}
            value={sortBy}
          />
          <FeatureSelect
            leftIcon={<SlidersHorizontal className="size-3.5" />}
            onChange={(value) =>
              onStatusFilterChange(value as AgencyStatusFilter)
            }
            options={[
              { label: "Todos os status", value: "all" },
              { label: "Ativas", value: "active" },
              { label: "Vencem em breve", value: "expiring" },
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
