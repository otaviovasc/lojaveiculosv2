import { Bot, CarFront, FileText, UploadCloud } from "lucide-react";
import type { ComponentType } from "react";
import {
  FeatureKpiCard,
  FeatureKpiStrip,
} from "../../components/ui/FeatureKpis";

export type DocumentOriginFilter = "all" | "automatic" | "manual";

export type DocumentsKpiSummary = {
  automatic: number;
  manual: number;
  total: number;
  vehicles: number;
};

type Kpi = {
  filter: DocumentOriginFilter;
  icon: ComponentType<{ className?: string }>;
  label: string;
  tone: "blue" | "green" | "violet" | "pink";
  value: number;
};

export function DocumentsKpiSummary({
  activeOrigin,
  isLoading,
  onOriginSelect,
  summary,
}: {
  activeOrigin: DocumentOriginFilter;
  isLoading: boolean;
  onOriginSelect: (origin: DocumentOriginFilter) => void;
  summary: DocumentsKpiSummary;
}) {
  const cards: Kpi[] = [
    {
      filter: "all",
      icon: FileText,
      label: "Total",
      tone: "violet",
      value: summary.total,
    },
    {
      filter: "automatic",
      icon: Bot,
      label: "Automaticos",
      tone: "blue",
      value: summary.automatic,
    },
    {
      filter: "manual",
      icon: UploadCloud,
      label: "Envios manuais",
      tone: "pink",
      value: summary.manual,
    },
    {
      filter: "all",
      icon: CarFront,
      label: "Unidades",
      tone: "green",
      value: summary.vehicles,
    },
  ];

  return (
    <FeatureKpiStrip ariaLabel="Resumo de documentos">
      {cards.map((card) => (
        <FeatureKpiCard
          active={activeOrigin === card.filter}
          disabled={isLoading}
          icon={card.icon}
          key={card.label}
          label={card.label}
          onClick={() => onOriginSelect(card.filter)}
          tone={card.tone}
          value={card.value}
        />
      ))}
    </FeatureKpiStrip>
  );
}
