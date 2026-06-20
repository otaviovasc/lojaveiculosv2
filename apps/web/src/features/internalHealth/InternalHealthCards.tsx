import type { ReactNode } from "react";
import type { InternalHealthAlert, InternalHealthSnapshot } from "./types";

export function StatusBanner({
  snapshot,
}: {
  snapshot: InternalHealthSnapshot;
}) {
  return (
    <section className="internal-status" data-status={snapshot.status}>
      <div>
        <span>Status operacional</span>
        <strong>{statusLabel(snapshot.status)}</strong>
      </div>
      <p>Atualizado em {formatDate(snapshot.generatedAt)}</p>
    </section>
  );
}

export function AlertPanel({ alerts }: { alerts: InternalHealthAlert[] }) {
  return (
    <section className="internal-alert-grid">
      {alerts.length ? (
        alerts.map((alert) => (
          <article
            className="internal-alert-card"
            data-status={alert.severity}
            key={alert.key}
          >
            <strong>{alert.count}</strong>
            <span>{alert.message}</span>
          </article>
        ))
      ) : (
        <article className="internal-alert-card" data-status="healthy">
          <strong>0</strong>
          <span>Nenhum alerta operacional aberto.</span>
        </article>
      )}
    </section>
  );
}

export function OperatorQueue({
  snapshot,
}: {
  snapshot: InternalHealthSnapshot;
}) {
  const items = [
    {
      count: snapshot.summary.openSinkFailures,
      label: "falhas abertas no sink",
      status: snapshot.summary.openSinkFailures > 0 ? "critical" : "healthy",
    },
    {
      count: snapshot.summary.failedEvents,
      label: "eventos com falha",
      status: snapshot.summary.failedEvents > 0 ? "warning" : "healthy",
    },
    {
      count: snapshot.summary.deniedEvents,
      label: "acoes negadas",
      status: snapshot.summary.deniedEvents > 0 ? "warning" : "healthy",
    },
  ] satisfies {
    count: number;
    label: string;
    status: InternalHealthSnapshot["status"];
  }[];

  return (
    <section className="internal-queue">
      <div className="internal-panel-title">
        <strong>Fila de atencao</strong>
      </div>
      <div className="internal-queue-items">
        {items.map((item) => (
          <span data-status={item.status} key={item.label}>
            <strong>{item.count}</strong>
            {item.label}
          </span>
        ))}
      </div>
    </section>
  );
}

export function MetricCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <article className="internal-metric">
      <span>{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
    </article>
  );
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  }).format(new Date(value));
}

function statusLabel(status: InternalHealthSnapshot["status"]) {
  return status === "healthy"
    ? "Saudavel"
    : status === "warning"
      ? "Atencao"
      : "Critico";
}
