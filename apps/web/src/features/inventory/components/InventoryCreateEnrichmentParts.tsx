import {
  AlertTriangle,
  BadgeCheck,
  Bot,
  Info,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { formatCentsCurrency } from "../model/inventoryPricing";
import type {
  InventoryPlateLookupResponse,
  InventoryResaleAnalysisResponse,
  InventoryResaleTopic,
} from "../model/enrichmentTypes";

export type Loadable<T> =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; value: T }
  | { kind: "error"; message: string; requestId?: string };

export function LookupStatus({
  state,
}: {
  state: Loadable<InventoryPlateLookupResponse>;
}) {
  if (state.kind === "idle") return null;
  if (state.kind === "loading")
    return (
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-panel p-3 text-xs font-black text-muted animate-pulse">
        <LoaderCircle className="size-4 animate-spin text-accent" />
        <span>Consultando APIBrasil...</span>
      </div>
    );
  if (state.kind === "error")
    return (
      <div className="mt-3 flex items-start gap-2 rounded-xl border border-danger/20 bg-danger/5 p-3 text-xs font-black text-danger">
        <AlertTriangle className="size-4 shrink-0" />
        <div className="grid gap-1">
          <span>{state.message}</span>
          {state.requestId ? (
            <span className="font-mono text-[10px] text-danger/80">
              ID do erro: {state.requestId}
            </span>
          ) : null}
        </div>
      </div>
    );
  const facts = [
    state.value.vehicle.brand,
    state.value.vehicle.model,
    state.value.vehicle.modelYear,
    state.value.vehicle.color,
    state.value.vehicle.fuel,
    state.value.vehicle.transmission,
  ].filter(Boolean);
  return (
    <div className="rounded-xl border border-line bg-app p-4 space-y-3 shadow-inner">
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-black uppercase tracking-wide text-muted">
          Dados encontrados
        </span>
        <strong className="text-sm font-black text-app-text">
          {facts.join(" - ") || state.value.plate}
        </strong>
        <span className="text-xs font-bold text-accent-strong">
          FIPE: {formatCentsCurrency(state.value.fipe?.priceCents ?? null)}
        </span>
      </div>
      {state.value.metadata.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-line/60">
          {state.value.metadata.slice(0, 6).map((item) => (
            <span
              className="rounded-lg border border-line bg-panel px-2 py-1 text-[10px] font-bold text-muted"
              key={`${item.label}:${item.value}`}
            >
              {item.label}: {item.value}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function AnalysisPanel({
  canAnalyze,
  onGenerate,
  state,
}: {
  canAnalyze: boolean;
  onGenerate: () => void;
  state: Loadable<InventoryResaleAnalysisResponse>;
}) {
  const isLoading = state.kind === "loading";
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line/60 pb-3">
        <div className="flex items-center gap-2">
          <Bot className="size-4 text-accent-strong animate-pulse" />
          <span className="text-xs font-black uppercase tracking-wider text-app-text">
            Copilot de Revenda
          </span>
          <span className="bg-accent-soft text-accent-strong text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border border-accent-soft/20">
            IA
          </span>
        </div>
        <button
          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-accent-soft/30 bg-accent-soft px-3 text-xs font-black text-accent-strong transition-all hover:bg-accent-soft/75 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          disabled={!canAnalyze || isLoading}
          onClick={onGenerate}
          type="button"
        >
          {isLoading ? (
            <LoaderCircle className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
          <span>
            {state.kind === "success" ? "Refazer análise" : "Gerar análise"}
          </span>
        </button>
      </div>
      <AnalysisStatus state={state} canAnalyze={canAnalyze} />
    </div>
  );
}

function AnalysisStatus({
  state,
  canAnalyze,
}: {
  state: Loadable<InventoryResaleAnalysisResponse>;
  canAnalyze: boolean;
}) {
  if (state.kind === "idle") {
    if (!canAnalyze)
      return (
        <div className="flex flex-col gap-2 rounded-xl border border-line bg-app p-4 text-xs font-bold text-muted transition-all">
          <div className="flex items-center gap-2 text-warning">
            <Info className="size-4 shrink-0" />
            <span className="font-black uppercase tracking-wider text-[10px]">
              Dados Insuficientes
            </span>
          </div>
          <p className="leading-relaxed">
            Preencha a placa ou insira os dados do veículo (Marca, Modelo e Ano)
            para habilitar a análise de revenda por inteligência artificial.
          </p>
        </div>
      );
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-accent-soft/20 bg-accent-soft/5 p-4 text-xs font-bold text-app-text transition-all animate-pulse">
        <div className="flex items-center gap-2 text-accent-strong">
          <Bot className="size-4 shrink-0 animate-bounce" />
          <span className="font-black uppercase tracking-wider text-[10px]">
            Pronto para Analisar
          </span>
        </div>
        <p className="text-muted leading-relaxed">
          Dados do veículo identificados. Clique em{" "}
          <strong>Gerar análise</strong> para obter insights sobre o risco e
          liquidez de revenda.
        </p>
      </div>
    );
  }

  if (state.kind === "loading")
    return (
      <div className="space-y-3 animate-pulse">
        <div className="rounded-xl border border-line bg-app/50 p-4 space-y-3">
          <div className="h-3 w-1/3 bg-line-strong rounded" />
          <div className="flex items-end gap-2">
            <div className="h-8 w-16 bg-line-strong rounded" />
            <div className="h-4 w-8 bg-line rounded" />
          </div>
          <div className="space-y-1.5 pt-2 border-t border-line/40">
            <div className="h-3 w-full bg-line rounded" />
            <div className="h-3 w-5/6 bg-line rounded" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-10 w-full bg-app-elevated border border-line/40 rounded-xl" />
          <div className="h-10 w-full bg-app-elevated border border-line/40 rounded-xl" />
        </div>
      </div>
    );

  if (state.kind === "error")
    return (
      <div className="flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/10 p-4 text-xs font-bold text-danger">
        <AlertTriangle className="size-4 shrink-0" />
        <div className="grid gap-1">
          <p>{state.message}</p>
          {state.requestId ? (
            <span className="font-mono text-[10px] text-danger/80">
              ID do erro: {state.requestId}
            </span>
          ) : null}
        </div>
      </div>
    );

  const risk = state.value.riskLevel;
  const score = state.value.dealRiskScore;
  const isMed = risk === "medium";
  const isHigh = risk === "high";

  const riskColorClass = isHigh
    ? "text-danger"
    : isMed
      ? "text-warning"
      : "text-green-start";
  const riskBgClass = isHigh
    ? "bg-danger/5 border-danger/20"
    : isMed
      ? "bg-warning/5 border-warning/20"
      : "bg-green-soft border-green-start/20";
  const riskProgressColor = isHigh
    ? "bg-danger"
    : isMed
      ? "bg-warning"
      : "bg-green-start";
  const riskText = isHigh
    ? "Risco Alto"
    : isMed
      ? "Risco Médio"
      : "Risco Baixo";

  return (
    <div className="flex flex-col gap-4">
      <div className={`rounded-xl border p-4 transition-all ${riskBgClass}`}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wide text-muted">
            Score de Risco do Negócio
          </span>
          <span
            className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-current/20 ${riskColorClass}`}
          >
            {riskText}
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <strong className="text-3xl font-black text-app-text tracking-tight animate-fade-in">
            {score}
          </strong>
          <span className="text-xs font-bold text-muted">/100</span>
        </div>
        <div className="mt-3 w-full bg-line/60 h-2 rounded-full overflow-hidden border border-line/30">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${riskProgressColor}`}
            style={{ width: `${score}%` }}
          />
        </div>
        <p className="mt-3 text-xs font-bold leading-relaxed text-app-text">
          {state.value.summary}
        </p>
      </div>

      <div className="grid gap-2">
        {state.value.topics.map((t) => (
          <TopicRow key={`${t.code}:${t.title}`} topic={t} />
        ))}
      </div>

      {state.value.suggestedDescription && (
        <div className="rounded-xl border border-line bg-app p-4 space-y-2 shadow-sm animate-fade-in">
          <div className="flex items-center gap-1.5 text-accent-strong">
            <Bot className="size-3.5" />
            <span className="text-[10px] font-black uppercase tracking-wide text-muted">
              Sugestão de Descrição por IA
            </span>
          </div>
          <p className="text-xs font-semibold leading-relaxed text-muted font-mono bg-panel p-2.5 rounded-lg border border-line/50 select-all cursor-pointer hover:border-line transition-all">
            {state.value.suggestedDescription}
          </p>
          <p className="text-[9px] font-bold text-muted text-right">
            Clique no texto acima para selecionar e copiar
          </p>
        </div>
      )}
    </div>
  );
}

function TopicRow({ topic }: { topic: InventoryResaleTopic }) {
  const isPos = topic.type === "positive";
  const isNeg = topic.type === "negative";
  const rowStyles = isPos
    ? "bg-green-soft border-green-start/10"
    : isNeg
      ? "bg-danger/5 border-danger/10"
      : "bg-warning/5 border-warning/10";
  const iconColor = isPos
    ? "text-green-start"
    : isNeg
      ? "text-danger"
      : "text-warning";
  const Icon = isPos ? BadgeCheck : isNeg ? AlertTriangle : Info;

  return (
    <div
      className={`flex gap-3 rounded-xl border p-3.5 transition-all hover:scale-[1.01] ${rowStyles}`}
    >
      <Icon className={`mt-0.5 size-4 shrink-0 ${iconColor}`} />
      <div className="min-w-0 space-y-1">
        <strong className="text-xs font-black text-app-text tracking-wide block">
          {topic.code} - {topic.title}
        </strong>
        <p className="text-xs font-bold leading-relaxed text-muted">
          {topic.message}
        </p>
      </div>
    </div>
  );
}
