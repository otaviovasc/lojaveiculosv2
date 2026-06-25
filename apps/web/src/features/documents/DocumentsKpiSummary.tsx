import { Bot, CarFront, FileText, UploadCloud } from "lucide-react";
import type { ComponentType } from "react";
import { AnimatedCounter } from "../../components/ui/CountUp";

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
    <div
      className="documents-kpi-strip"
      role="group"
      aria-label="Resumo de documentos"
    >
      {cards.map((card) => {
        const Icon = card.icon;
        const isActive = activeOrigin === card.filter;
        const toneClass =
          card.tone === "green"
            ? "kpi-gradient-green"
            : card.tone === "blue"
              ? "kpi-gradient-blue"
              : card.tone === "violet"
                ? "kpi-gradient-violet"
                : "kpi-gradient-pink";

        return (
          <button
            aria-label={`Filtrar por ${card.label}`}
            aria-pressed={isActive}
            className={
              "documents-kpi-card flex items-center gap-3 !p-3 !px-4 !rounded-xl " +
              toneClass +
              " w-full border border-white/10 text-left text-white cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.015] " +
              (isActive
                ? "ring-2 ring-white/70 ring-offset-2 ring-offset-app "
                : "")
            }
            disabled={isLoading}
            key={card.label}
            onClick={() => onOriginSelect(card.filter)}
            type="button"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15 border border-white/10">
              <Icon aria-hidden="true" className="size-4 text-white" />
            </div>
            <div className="min-w-0">
              <span className="block text-[9px] font-black uppercase tracking-wider text-white/70 leading-none">
                {card.label}
              </span>
              <strong className="block text-lg font-black text-white mt-1.5 leading-none">
                <AnimatedCounter value={card.value} />
              </strong>
            </div>
          </button>
        );
      })}
    </div>
  );
}
