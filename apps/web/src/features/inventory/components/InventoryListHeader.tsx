import { Car, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import {
  FeatureKpiCard,
  FeatureKpiStrip,
} from "../../../components/ui/FeatureKpis";
import type { InventoryListStatusFilter } from "../model/listCatalogModel";

export function InventoryListHeader({
  activeStatus,
  available,
  onStatusSelect,
  reserved,
  sold,
  total,
}: {
  activeStatus: InventoryListStatusFilter;
  available: number;
  onStatusSelect: (status: InventoryListStatusFilter) => void;
  reserved: number;
  sold: number;
  total: number;
}) {
  const stats = [
    {
      label: "Total em Estoque",
      value: total,
      tone: "violet",
      icon: Car,
      status: "",
    },
    {
      label: "Disponíveis",
      value: available,
      tone: "green",
      icon: CheckCircle2,
      status: "available",
    },
    {
      label: "Reservados",
      value: reserved,
      tone: "pink",
      icon: Clock,
      status: "reserved",
    },
    {
      label: "Vendidos",
      value: sold,
      tone: "blue",
      icon: TrendingUp,
      status: "sold",
    },
  ] satisfies Array<{
    icon: typeof Car;
    label: string;
    status: InventoryListStatusFilter;
    tone: "blue" | "green" | "pink" | "violet";
    value: number;
  }>;

  return (
    <FeatureKpiStrip ariaLabel="Resumo do inventário">
      {stats.map((stat, idx) => (
        <FeatureKpiCard
          active={activeStatus === stat.status}
          animationIndex={idx}
          icon={stat.icon}
          key={stat.label}
          label={stat.label}
          onClick={() => onStatusSelect(stat.status)}
          tone={stat.tone}
          value={stat.value}
        />
      ))}
    </FeatureKpiStrip>
  );
}
