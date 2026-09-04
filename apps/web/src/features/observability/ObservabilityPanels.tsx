import { Activity, Clipboard, Search, TerminalSquare } from "lucide-react";
import { FeatureTextarea } from "../../components/ui/FeatureControls";
import {
  FeatureActionButton,
  FeatureSection,
} from "../../components/ui/FeatureLayout";
import {
  FeatureEmptyState,
  FeatureStatusBadge,
} from "../../components/ui/FeatureStates";
import { FeatureTableFrame } from "../../components/ui/FeatureTable";
import type { ObservabilityEvent, ObservabilitySnapshot } from "./apiClient";

export function SummaryCards({
  snapshot,
}: {
  snapshot: ObservabilitySnapshot;
}) {
  const cards = [
    ["Status da plataforma", snapshot.status, snapshot.status],
    ["Eventos recentes", snapshot.summary.recentEvents, "blue"],
    [
      "Falhas / denied",
      snapshot.summary.failedEvents + snapshot.summary.deniedEvents,
      "danger",
    ],
    ["Sink failures abertos", snapshot.summary.openSinkFailures, "warning"],
  ] as const;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(([label, value, tone]) => (
        <div className="glass-panel-branded p-5" key={label}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-black uppercase tracking-wider text-muted">
              {label}
            </span>
            {label === "Status da plataforma" ? (
              <Activity className="size-4 text-accent" />
            ) : null}
          </div>
          <div className="mt-3 text-2xl font-black text-app-text">{value}</div>
          <div className="mt-3">
            <FeatureStatusBadge
              tone={
                tone === "healthy"
                  ? "success"
                  : tone === "critical"
                    ? "danger"
                    : tone === "warning"
                      ? "warning"
                      : tone === "blue"
                        ? "blue"
                        : "neutral"
              }
            >
              {tone === "blue" ? "observed" : "audit"}
            </FeatureStatusBadge>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TimelinePanel({
  events,
  onSelect,
  selectedEventId,
}: {
  events: readonly ObservabilityEvent[];
  onSelect: (eventId: string) => void;
  selectedEventId: string | null;
}) {
  return (
    <FeatureSection
      className="min-w-0"
      description="Eventos mais recentes primeiro. Selecione um evento para inspecionar o contexto ontológico."
      icon={<TerminalSquare className="size-5" />}
      padding="compact"
      title="Linha do tempo operacional"
    >
      {events.length === 0 ? (
        <FeatureEmptyState
          body="Tente remover filtros ou aumentar o limite da consulta."
          className="mt-5"
          density="compact"
          icon={Search}
          title="Nenhum evento encontrado"
        />
      ) : (
        <FeatureTableFrame className="mt-5">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line bg-panel/60 text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">Quando</th>
                <th className="px-4 py-3">Evento</th>
                <th className="px-4 py-3">Resultado</th>
                <th className="px-4 py-3">Objeto</th>
                <th className="px-4 py-3">Request / correlation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {events.map((event) => (
                <tr
                  className={
                    selectedEventId === event.id
                      ? "bg-accent-soft"
                      : "hover:bg-panel/70"
                  }
                  key={event.id}
                >
                  <td className="whitespace-nowrap px-4 py-3 align-top text-xs font-bold text-muted">
                    {formatDate(event.occurredAt)}
                  </td>
                  <td className="max-w-[250px] px-4 py-3 align-top">
                    <button
                      className="text-left"
                      onClick={() => onSelect(event.id)}
                      type="button"
                    >
                      <span className="block truncate font-black text-app-text">
                        {event.action}
                      </span>
                      <span className="mt-1 block truncate text-xs font-medium text-muted">
                        {event.summary ?? event.category ?? "sem resumo"}
                      </span>
                    </button>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <FeatureStatusBadge size="compact" tone={eventTone(event)}>
                      {event.outcome}
                    </FeatureStatusBadge>
                  </td>
                  <td className="max-w-[180px] px-4 py-3 align-top text-xs font-bold text-muted">
                    <span className="block truncate text-app-text">
                      {event.entityType}
                    </span>
                    <span className="block truncate">{event.entityId}</span>
                  </td>
                  <td className="max-w-[190px] px-4 py-3 align-top text-xs font-bold text-muted">
                    <span className="block truncate">{event.requestId}</span>
                    <span className="block truncate">
                      {event.correlationId ?? "sem correlation"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </FeatureTableFrame>
      )}
    </FeatureSection>
  );
}

export function EventDetailPanel({
  aiContext,
  event,
  onCopyContext,
  onCopyEvent,
}: {
  aiContext: string;
  event: ObservabilityEvent | null;
  onCopyContext: () => void;
  onCopyEvent: (event: ObservabilityEvent) => void;
}) {
  return (
    <FeatureSection
      className="min-w-0"
      description="Contexto pronto para colar em um workflow de AI ou em um ticket de incidente."
      icon={<Clipboard className="size-5" />}
      padding="compact"
      title="Contexto de investigação"
      actions={
        <FeatureActionButton
          icon={Clipboard}
          label="Copiar contexto"
          onClick={onCopyContext}
          variant="primary"
        />
      }
    >
      {event ? (
        <div className="mt-5 grid gap-4">
          <div className="grid gap-2 rounded-xl border border-line bg-app/60 p-4 text-xs font-bold text-muted">
            <ContextValue label="requestId" value={event.requestId} />
            <ContextValue
              label="correlationId"
              value={event.correlationId ?? "—"}
            />
            <ContextValue
              label="actor"
              value={`${event.actorKind}:${event.actorId}`}
            />
            <ContextValue
              label="source"
              value={event.source ? JSON.stringify(event.source) : "—"}
            />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-muted">
                Evento selecionado
              </span>
              <button
                className="text-xs font-black text-accent-strong hover:underline"
                onClick={() => onCopyEvent(event)}
                type="button"
              >
                Copiar JSON
              </button>
            </div>
            <FeatureTextarea
              aria-label="Evento selecionado em JSON"
              readOnly
              value={JSON.stringify(event, null, 2)}
            />
          </div>
          <div>
            <span className="mb-2 block text-xs font-black uppercase tracking-wider text-muted">
              AI debug bundle
            </span>
            <FeatureTextarea
              aria-label="Contexto para AI"
              readOnly
              value={aiContext}
            />
          </div>
        </div>
      ) : (
        <FeatureEmptyState
          body="Selecione um evento na linha do tempo para ver os identificadores, metadados e o bundle para AI."
          className="mt-5"
          density="compact"
          icon={Clipboard}
          title="Selecione um evento"
        />
      )}
    </FeatureSection>
  );
}

function ContextValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[120px_1fr] sm:items-center">
      <span className="uppercase tracking-wider text-muted">{label}</span>
      <code className="truncate text-app-text">{value}</code>
    </div>
  );
}

function eventTone(event: ObservabilityEvent) {
  if (
    event.outcome === "failed" ||
    event.severity === "critical" ||
    event.severity === "error"
  )
    return "danger" as const;
  if (event.outcome === "denied" || event.severity === "warning")
    return "warning" as const;
  if (event.outcome === "succeeded") return "success" as const;
  return "neutral" as const;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));
}
