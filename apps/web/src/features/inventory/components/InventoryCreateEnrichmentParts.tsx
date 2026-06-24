import {
  AlertTriangle,
  BadgeCheck,
  Bot,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { formatCentsCurrency } from "../model/inventoryPricing";
import type {
  InventoryPlateLookupResponse,
  InventoryResaleAnalysisResponse,
  InventoryResaleTopic,
} from "../model/enrichmentTypes";
import type { ReactElement } from "react";

export type Loadable<T> =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; value: T }
  | { kind: "error"; message: string };

export function LookupStatus({
  state,
}: {
  state: Loadable<InventoryPlateLookupResponse>;
}) {
  if (state.kind === "idle") {
    return (
      <p className="text-xs font-bold text-muted">
        Se a consulta falhar, continue preenchendo manualmente.
      </p>
    );
  }
  if (state.kind === "loading") {
    return (
      <StateMessage icon={<LoaderCircle />} text="Consultando APIBrasil." />
    );
  }
  if (state.kind === "error") {
    return (
      <StateMessage danger icon={<AlertTriangle />} text={state.message} />
    );
  }

  const lookup = state.value;
  const facts = [
    lookup.vehicle.brand,
    lookup.vehicle.model,
    lookup.vehicle.modelYear,
    lookup.vehicle.color,
    lookup.vehicle.fuel,
    lookup.vehicle.transmission,
  ].filter(Boolean);

  return (
    <div className="rounded-xl border border-line bg-app p-4">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-black uppercase tracking-wide text-muted">
          Dados encontrados
        </span>
        <strong className="text-sm font-black text-app-text">
          {facts.join(" - ") || lookup.plate}
        </strong>
        <span className="text-xs font-bold text-muted">
          FIPE: {formatCentsCurrency(lookup.fipe?.priceCents ?? null)}
        </span>
      </div>
      {lookup.metadata.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {lookup.metadata.slice(0, 6).map((item) => (
            <span
              className="rounded-lg border border-line bg-panel px-2 py-1 text-xs font-bold text-muted"
              key={`${item.label}:${item.value}`}
            >
              {item.label}: {item.value}
            </span>
          ))}
        </div>
      ) : null}
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
  return (
    <div className="rounded-xl border border-line bg-app p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Bot className="size-4 text-accent-strong" />
          <span className="text-xs font-black uppercase tracking-wide text-muted">
            Análise de revenda
          </span>
        </div>
        <button
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-accent-soft/30 bg-accent-soft px-3 text-xs font-black text-accent-strong transition-colors hover:bg-accent-soft/70 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canAnalyze || state.kind === "loading"}
          onClick={onGenerate}
          type="button"
        >
          {state.kind === "loading" ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
          <span>Gerar análise</span>
        </button>
      </div>
      <AnalysisStatus state={state} />
    </div>
  );
}

function AnalysisStatus({
  state,
}: {
  state: Loadable<InventoryResaleAnalysisResponse>;
}) {
  if (state.kind === "idle") {
    return (
      <p className="mt-3 text-xs font-bold text-muted">Aguardando dados.</p>
    );
  }
  if (state.kind === "loading") {
    return <StateMessage icon={<LoaderCircle />} text="Gerando análise." />;
  }
  if (state.kind === "error") {
    return (
      <StateMessage danger icon={<AlertTriangle />} text={state.message} />
    );
  }
  return (
    <div className="mt-4 flex flex-col gap-3">
      <p className="text-sm font-black text-app-text">{state.value.summary}</p>
      <div className="grid gap-2">
        {state.value.topics.map((topic) => (
          <TopicRow key={`${topic.code}:${topic.title}`} topic={topic} />
        ))}
      </div>
      <p className="rounded-lg border border-line bg-panel p-3 text-xs font-bold text-muted">
        {state.value.suggestedDescription}
      </p>
    </div>
  );
}

function TopicRow({ topic }: { topic: InventoryResaleTopic }) {
  const positive = topic.type === "positive";
  return (
    <div className="flex gap-3 rounded-lg border border-line bg-panel p-3">
      {positive ? (
        <BadgeCheck className="mt-0.5 size-4 shrink-0 text-accent-strong" />
      ) : (
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" />
      )}
      <div className="min-w-0 space-y-1">
        <strong className="text-xs font-black text-app-text">
          {topic.code} - {topic.title}
        </strong>
        <p className="text-xs font-bold text-muted">{topic.message}</p>
      </div>
    </div>
  );
}

function StateMessage({
  danger = false,
  icon,
  text,
}: {
  danger?: boolean;
  icon: ReactElement;
  text: string;
}) {
  const className = danger
    ? "mt-3 flex items-center gap-2 rounded-lg border border-line bg-panel p-3 text-xs font-black text-danger"
    : "mt-3 flex items-center gap-2 rounded-lg border border-line bg-panel p-3 text-xs font-black text-muted";

  return (
    <p className={className}>
      {icon}
      {text}
    </p>
  );
}
