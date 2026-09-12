import { useState, type ReactNode } from "react";
import {
  CalendarCheck,
  CarFront,
  Check,
  CheckCircle2,
  Clock,
  Link2,
  X,
} from "lucide-react";
import type { CrmVehicleOption } from "./crmConversationExtraTypes";
import type { CrmConversationCycle } from "./crmConversationTypes";
import type {
  CrmLeadVisit,
  CrmVisitsApi,
  LeadVisitStatus,
} from "./crmVisitsApi";

export type VisitView =
  "completed" | "overdue" | "today" | "tomorrow" | "upcoming";

export type CrmVisitsPageProps = {
  activeSession: CrmConversationCycle | null;
  api?: CrmVisitsApi;
  canManage: boolean;
  canRead: boolean;
  listVehicles?: () => Promise<readonly CrmVehicleOption[]>;
};

export const visitViewLabels: Record<VisitView, string> = {
  today: "Hoje",
  tomorrow: "Amanhã",
  upcoming: "Próximas",
  overdue: "Atrasadas",
  completed: "Finalizadas",
};

export const visitViewOrder = Object.keys(visitViewLabels) as VisitView[];

export function VisitBoard({
  activeView,
  canManage,
  error,
  isLoading,
  isSaving,
  onStatus,
  onViewChange,
  viewCounts,
  visits,
}: {
  activeView: VisitView;
  canManage: boolean;
  error: string | null;
  isLoading: boolean;
  isSaving: boolean;
  onStatus: (visit: CrmLeadVisit, status: LeadVisitStatus) => void;
  onViewChange: (view: VisitView) => void;
  viewCounts: Record<VisitView, number>;
  visits: CrmLeadVisit[];
}) {
  return (
    <section className="crm-visits-board">
      {error ? <p className="crm-visits-error">{error}</p> : null}
      <div className="crm-visits-filters" role="tablist">
        {visitViewOrder.map((view) => (
          <button
            aria-selected={activeView === view}
            className={
              activeView === view
                ? "crm-visits-filter crm-visits-filter-active"
                : "crm-visits-filter"
            }
            key={view}
            onClick={() => onViewChange(view)}
            role="tab"
            type="button"
          >
            {visitViewLabels[view]}
            <span>{viewCounts[view]}</span>
          </button>
        ))}
      </div>

      <div className="crm-visits-group">
        <header>
          <span />
          <h3>{visitViewLabels[activeView]}</h3>
        </header>
        <div className="crm-visits-timeline">
          {isLoading ? (
            <>
              <VisitSkeleton />
              <VisitSkeleton />
              <VisitSkeleton />
            </>
          ) : visits.length ? (
            visits.map((visit) => (
              <VisitRow
                canManage={canManage}
                isSaving={isSaving}
                key={visit.id}
                onStatus={onStatus}
                visit={visit}
              />
            ))
          ) : (
            <VisitEmpty label="Nenhuma visita nesta visao." />
          )}
        </div>
      </div>
    </section>
  );
}

function VisitSkeleton() {
  return (
    <div className="crm-visit-skeleton">
      <div className="flex justify-between items-center gap-2">
        <div className="crm-skeleton-bar h-5 w-28" />
        <div className="crm-skeleton-bar h-5 w-20 rounded-full" />
      </div>
      <div className="crm-skeleton-bar h-6 w-44" />
      <div className="crm-skeleton-bar h-4 w-32" />
    </div>
  );
}

export function countVisitsByView(visits: CrmLeadVisit[]) {
  return Object.fromEntries(
    visitViewOrder.map((view) => [
      view,
      visits.filter((visit) => visitMatchesView(visit, view)).length,
    ]),
  ) as Record<VisitView, number>;
}

export function visitsForView(visits: CrmLeadVisit[], view: VisitView) {
  return visits.filter((visit) => visitMatchesView(visit, view));
}

export function VisitRow({
  canManage,
  isSaving,
  onStatus,
  visit,
}: {
  canManage: boolean;
  isSaving: boolean;
  onStatus: (visit: CrmLeadVisit, status: LeadVisitStatus) => void;
  visit: CrmLeadVisit;
}) {
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);
  const isOpen = visit.status === "scheduled" || visit.status === "confirmed";

  return (
    <article className="crm-visit-row" data-status={visit.status}>
      <span aria-hidden="true" className="crm-visit-marker" />
      <div className="crm-visit-row-main">
        <div className="crm-visit-row-copy">
          <div className="crm-visit-badges">
            <span className="crm-visit-time-pill">
              <Clock aria-hidden="true" />
              {formatTime(visit.scheduledAt)}
            </span>
            <span className="crm-visit-status-badge" data-status={visit.status}>
              {statusLabel(visit.status)}
            </span>
          </div>
          <strong>{formatDate(visit.scheduledAt)}</strong>
          <a href={`#/crm?surface=leads&leadId=${visit.leadId}`}>
            <Link2 aria-hidden="true" className="size-3" />
            Lead vinculado
          </a>
          {visit.vehicleTitle ? (
            <div className="crm-visit-vehicle-chip">
              <CarFront aria-hidden="true" />
              <span>{visit.vehicleTitle}</span>
            </div>
          ) : null}
          {visit.notes ? (
            <p className="crm-visit-notes-box">{visit.notes}</p>
          ) : null}
        </div>
        <div className="crm-visit-actions">
          {visit.status === "scheduled" ? (
            <button
              aria-label="Confirmar visita"
              className="crm-visit-action-btn"
              data-action="confirm"
              disabled={!canManage || isSaving}
              onClick={() => onStatus(visit, "confirmed")}
              title="Confirmar visita"
              type="button"
            >
              <Check aria-hidden="true" />
              <span>Confirmar</span>
            </button>
          ) : null}
          {visit.status === "confirmed" ? (
            <>
              <button
                aria-label="Concluir visita"
                className="crm-visit-action-btn"
                data-action="complete"
                disabled={!canManage || isSaving}
                onClick={() => onStatus(visit, "completed")}
                title="Concluir visita"
                type="button"
              >
                <CheckCircle2 aria-hidden="true" />
                <span>Concluir</span>
              </button>
              <button
                aria-label="Marcar ausência"
                className="crm-visit-action-btn"
                disabled={!canManage || isSaving}
                onClick={() => onStatus(visit, "no_show")}
                title="Cliente não compareceu"
                type="button"
              >
                <X aria-hidden="true" />
                <span>Não compareceu</span>
              </button>
            </>
          ) : null}
          {isOpen ? (
            isConfirmingCancel ? (
              <>
                <button
                  aria-label="Confirmar cancelamento da visita"
                  className="crm-visit-action-btn"
                  data-action="cancel"
                  disabled={!canManage || isSaving}
                  onClick={() => onStatus(visit, "cancelled")}
                  type="button"
                >
                  <Check aria-hidden="true" />
                  <span>Confirmar cancelamento</span>
                </button>
                <button
                  aria-label="Manter visita"
                  className="crm-visit-action-btn"
                  disabled={isSaving}
                  onClick={() => setIsConfirmingCancel(false)}
                  type="button"
                >
                  <X aria-hidden="true" />
                  <span>Voltar</span>
                </button>
              </>
            ) : (
              <button
                aria-label="Cancelar visita"
                className="crm-visit-action-btn"
                data-action="cancel"
                disabled={!canManage || isSaving}
                onClick={() => setIsConfirmingCancel(true)}
                title="Cancelar visita"
                type="button"
              >
                <X aria-hidden="true" />
                <span>Cancelar</span>
              </button>
            )
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function VisitEmpty({ label }: { label: string }) {
  return (
    <div className="crm-visit-empty">
      <span aria-hidden="true" className="crm-visit-empty-icon">
        <CalendarCheck />
      </span>
      <strong>{label}</strong>
      <p>
        Agendamentos presenciais criados ou vinculados a leads aparecerão aqui.
      </p>
    </div>
  );
}

function statusLabel(status: LeadVisitStatus) {
  const labels: Record<LeadVisitStatus, string> = {
    cancelled: "Cancelada",
    completed: "Concluída",
    confirmed: "Confirmada",
    no_show: "Não compareceu",
    scheduled: "Agendada",
  };
  return labels[status];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function visitMatchesView(visit: CrmLeadVisit, view: VisitView) {
  const scheduled = new Date(visit.scheduledAt);
  const now = new Date();
  const isClosed = ["cancelled", "completed", "no_show"].includes(visit.status);
  if (view === "completed") return isClosed;
  if (isClosed) return false;
  if (view === "today") return isSameDay(scheduled, now);
  if (view === "tomorrow") return isSameDay(scheduled, startOfTomorrow(now));
  if (view === "overdue") return scheduled < startOfDay(now);
  return scheduled >= startOfAfterTomorrow(now);
}

function isSameDay(left: Date, right: Date) {
  return left.toDateString() === right.toDateString();
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function startOfTomorrow(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate() + 1);
}

function startOfAfterTomorrow(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate() + 2);
}
