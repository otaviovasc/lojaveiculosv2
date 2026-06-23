import {
  FileText,
  RefreshCcw,
  Search,
  CheckCircle,
  PenTool,
  Database,
} from "lucide-react";
import type { ComponentType } from "react";
import { AnimatedCounter } from "../../components/ui/CountUp";
import AnimatedContent from "../../components/ui/AnimatedContent";
import { CustomSelect } from "../../components/ui/CustomSelect";
import type {
  DocumentKind,
  DocumentLinkTarget,
  DocumentStatus,
  ListDocumentsFilters,
} from "./types";
import { kindOptions, statusOptions, targetOptions } from "./documentLabels";

export function Metric({
  label,
  value,
  tone = "violet",
  icon: KpiIcon,
  idx = 0,
}: {
  label: string;
  value: string;
  tone?: "violet" | "green" | "pink" | "blue";
  icon: ComponentType<{ className?: string }>;
  idx?: number;
}) {
  const toneClass =
    tone === "green"
      ? "kpi-gradient-green"
      : tone === "blue"
        ? "kpi-gradient-blue"
        : tone === "violet"
          ? "kpi-gradient-violet"
          : "kpi-gradient-pink";
  const className = [
    "kpi-card-premium flex items-center gap-3 !p-3 !px-4 !rounded-xl",
    toneClass,
    "border border-white/10 shadow-sm text-white cursor-default transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.015]",
  ].join(" ");

  return (
    <AnimatedContent
      distance={20}
      delay={idx * 0.04}
      duration={0.6}
      ease="power2.out"
    >
      <div className={className}>
        {/* Shine highlight */}
        <div className="gloss-overlay" />

        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/15 border border-white/10 relative z-10">
          <KpiIcon className="size-4.5 text-white" />
        </div>
        <div className="min-w-0 relative z-10">
          <span className="block text-[9px] font-black uppercase tracking-wider text-white/70 leading-none">
            {label}
          </span>
          <strong className="block text-lg font-black text-white mt-1.5 leading-none">
            <AnimatedCounter value={value} />
          </strong>
        </div>
      </div>
    </AnimatedContent>
  );
}

export function SelectFilter({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
  value: string;
}) {
  return (
    <label className="documents-select">
      <span>{label}</span>
      <CustomSelect
        className="min-h-11 rounded-lg border border-line bg-app px-3 text-sm font-bold text-app-text outline-none focus:shadow-[var(--shadow-focus)]"
        onChange={onChange}
        options={options}
        value={value}
      />
    </label>
  );
}

export function DocumentsWorkspaceHeader({
  counts,
  filters,
  isResultCapped,
  onRefresh,
  resultLimit,
  updateFilter,
}: {
  counts: {
    contexts: number;
    issued: number;
    signature: number;
    total: number;
  };
  filters: ListDocumentsFilters;
  isResultCapped: boolean;
  onRefresh: () => void;
  resultLimit: number;
  updateFilter: <Key extends keyof ListDocumentsFilters>(
    key: Key,
    value: ListDocumentsFilters[Key],
  ) => void;
}) {
  return (
    <>
      <section className="glass-panel-branded documents-hero !p-5 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="documents-badge">
            <FileText aria-hidden="true" className="size-4" />
            Workspace
          </span>
          <h2>Documentos compartilhados</h2>
          <p>
            {isResultCapped
              ? `Mostrando os ${resultLimit} documentos mais recentes. Use filtros para refinar pastas e contagens.`
              : "Arquivos vinculados a veículos, leads, vendas, pagamentos, financeiro e fiscal em uma única lista auditada."}
          </p>
        </div>
        <button
          aria-label="Atualizar documentos"
          className="inline-flex size-10 items-center justify-center rounded-lg border border-line bg-app-elevated text-muted hover:text-primary hover:border-line-strong transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
          onClick={onRefresh}
          title="Atualizar documentos"
          type="button"
        >
          <RefreshCcw aria-hidden="true" className="size-4.5" />
        </button>
      </section>

      <section
        className="grid gap-3 grid-cols-2 xl:grid-cols-4"
        aria-label="Resumo de documentos"
      >
        <Metric
          label={isResultCapped ? "Carregados" : "Total"}
          value={String(counts.total)}
          tone="violet"
          icon={FileText}
          idx={0}
        />
        <Metric
          label="Emitidos"
          value={String(counts.issued)}
          tone="green"
          icon={CheckCircle}
          idx={1}
        />
        <Metric
          label="Assinatura"
          value={String(counts.signature)}
          tone="pink"
          icon={PenTool}
          idx={2}
        />
        <Metric
          label="Contextos"
          value={String(counts.contexts)}
          tone="blue"
          icon={Database}
          idx={3}
        />
      </section>

      <section
        className="glass-panel-branded documents-toolbar !p-5"
        aria-label="Filtros"
      >
        <label className="documents-search">
          <Search aria-hidden="true" className="size-4" />
          <input
            onChange={(event) => updateFilter("search", event.target.value)}
            placeholder="Buscar por título ou arquivo"
            value={filters.search ?? ""}
          />
        </label>
        <SelectFilter
          label="Tipo"
          onChange={(value) => updateFilter("kind", value as DocumentKind | "")}
          options={kindOptions}
          value={filters.kind ?? ""}
        />
        <SelectFilter
          label="Status"
          onChange={(value) =>
            updateFilter("status", value as DocumentStatus | "")
          }
          options={statusOptions}
          value={filters.status ?? ""}
        />
        <SelectFilter
          label="Contexto"
          onChange={(value) =>
            updateFilter("targetType", value as DocumentLinkTarget | "")
          }
          options={targetOptions}
          value={filters.targetType ?? ""}
        />
      </section>
    </>
  );
}
