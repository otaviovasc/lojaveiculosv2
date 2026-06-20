import { formatDate } from "./InternalHealthCards";
import type {
  InternalActionMetric,
  InternalActorMetric,
  InternalAuditEvent,
  InternalAuditSinkFailure,
  InternalBreakdownMetric,
  InternalSinkMetric,
} from "./types";

export function BreakdownList({
  items,
  title,
}: {
  items: InternalBreakdownMetric[];
  title: string;
}) {
  const max = Math.max(...items.map((item) => item.total), 1);
  return (
    <article className="internal-panel">
      <PanelTitle title={title} />
      <div className="internal-bars">
        {items.map((item) => (
          <div className="internal-bar-row" key={item.key}>
            <span>{item.key}</span>
            <strong>{item.total}</strong>
            <i style={{ width: `${(item.total / max) * 100}%` }} />
          </div>
        ))}
        {items.length === 0 ? <Empty /> : null}
      </div>
    </article>
  );
}

export function ActionTable({ items }: { items: InternalActionMetric[] }) {
  return (
    <article className="internal-panel">
      <PanelTitle title="Acoes mais frequentes" />
      <div className="internal-table">
        {items.map((item) => (
          <div
            className="internal-table-row internal-table-row-five"
            key={item.action}
          >
            <span>{item.action}</span>
            <span>{item.total} eventos</span>
            <span>{item.failedCount} falhas</span>
            <span>{item.deniedCount} negados</span>
            <code>{formatDate(item.lastOccurredAt)}</code>
          </div>
        ))}
        {items.length === 0 ? <Empty /> : null}
      </div>
    </article>
  );
}

export function ActorTable({ items }: { items: InternalActorMetric[] }) {
  return (
    <article className="internal-panel">
      <PanelTitle title="Atores ativos" />
      <div className="internal-table">
        {items.map((item) => (
          <div
            className="internal-table-row"
            key={`${item.actorKind}:${item.actorId}`}
          >
            <span>{item.actorKind}</span>
            <code>{item.actorId}</code>
            <span>{item.total} eventos</span>
            <span>{formatDate(item.lastSeenAt)}</span>
          </div>
        ))}
        {items.length === 0 ? <Empty /> : null}
      </div>
    </article>
  );
}

export function SinkTable({
  failures,
  metrics,
}: {
  failures: InternalAuditSinkFailure[];
  metrics: InternalSinkMetric[];
}) {
  return (
    <article className="internal-panel">
      <PanelTitle title="Audit sink" />
      <div className="internal-list">
        {metrics.map((metric) => (
          <div className="internal-row" key={metric.sinkName}>
            <div>
              <strong>{metric.sinkName}</strong>
              <small>
                {metric.failureTier} · {metric.openFailures} abertas ·{" "}
                {metric.totalAttempts} tentativas
              </small>
            </div>
          </div>
        ))}
        {failures.map((failure) => (
          <div className="internal-row" key={failure.id}>
            <div>
              <strong>{failure.sinkName}</strong>
              <small>
                {failure.failureTier} · {failure.attempts} tentativas ·{" "}
                {failure.requestId}
              </small>
              <code>{failure.lastError}</code>
            </div>
          </div>
        ))}
        {failures.length === 0 && metrics.length === 0 ? <Empty /> : null}
      </div>
    </article>
  );
}

export function RecentEvents({ events }: { events: InternalAuditEvent[] }) {
  return (
    <article className="internal-panel">
      <PanelTitle title="Auditoria recente" />
      <div className="internal-table">
        {events.map((event) => (
          <div className="internal-table-row" key={event.id}>
            <span>{event.action}</span>
            <span>{event.outcome}</span>
            <span>{event.severity}</span>
            <code>{event.requestId}</code>
          </div>
        ))}
        {events.length === 0 ? <Empty /> : null}
      </div>
    </article>
  );
}

function PanelTitle({ title }: { title: string }) {
  return (
    <div className="internal-panel-title">
      <strong>{title}</strong>
    </div>
  );
}

function Empty() {
  return <p className="internal-muted">Sem dados no intervalo atual.</p>;
}
