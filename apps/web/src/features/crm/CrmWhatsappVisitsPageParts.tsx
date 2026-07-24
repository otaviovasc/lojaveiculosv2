import type { ReactNode } from "react";
import { CarFront, Check, Clock, Link2, X } from "lucide-react";
import type { CrmWhatsappVehicleOption } from "./crmWhatsappExtraTypes";
import type { CrmWhatsappSession } from "./crmWhatsappTypes";
import type {
  CrmLeadVisit,
  CrmVisitsApi,
  LeadVisitStatus,
} from "./crmVisitsApi";

export type VisitView =
  "completed" | "overdue" | "today" | "tomorrow" | "upcoming";

export type CrmWhatsappVisitsPageProps = {
  activeSession: CrmWhatsappSession | null;
  api?: CrmVisitsApi;
  canManage: boolean;
  canRead: boolean;
  listVehicles?: () => Promise<readonly CrmWhatsappVehicleOption[]>;
};

export const visitViewLabels: Record<VisitView, string> = {
  today: "Hoje",
  tomorrow: "Amanha",
  upcoming: "Proximas",
  overdue: "Atrasadas",
  completed: "Concluidas",
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
    <section className="crm-whatsapp-visits-board">
      {error ? <p className="crm-whatsapp-visits-error">{error}</p> : null}
      <div className="crm-whatsapp-visits-filters">
        {visitViewOrder.map((view) => (
          <button
            aria-pressed={activeView === view}
            className={
              activeView === view
                ? "crm-whatsapp-visits-filter crm-whatsapp-visits-filter-active"
                : "crm-whatsapp-visits-filter"
            }
            key={view}
            onClick={() => onViewChange(view)}
            type="button"
          >
            {visitViewLabels[view]}
            <span>{viewCounts[view]}</span>
          </button>
        ))}
      </div>

      <div className="crm-whatsapp-visits-group">
        <header>
          <span />
          <h3>{visitViewLabels[activeView]}</h3>
        </header>
        <div className="crm-whatsapp-visits-timeline">
          {isLoading ? (
            <VisitEmpty label="Carregando visitas." />
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
  return (
    <article className="crm-whatsapp-visit-row">
      <span aria-hidden="true" className="crm-whatsapp-visit-marker" />
      <div className="crm-whatsapp-visit-row-main">
        <div className="crm-whatsapp-visit-row-copy">
          <div className="crm-whatsapp-visit-badges">
            <span>
              <Clock aria-hidden="true" className="size-3" />
              {formatTime(visit.scheduledAt)}
            </span>
            <span>{statusLabel(visit.status)}</span>
          </div>
          <strong>{formatDate(visit.scheduledAt)}</strong>
          <a href={`#/crm?surface=leads&leadId=${visit.leadId}`}>
            <Link2 aria-hidden="true" className="size-3" />
            Lead vinculado
          </a>
          {visit.vehicleTitle ? (
            <p>
              <CarFront aria-hidden="true" className="mr-1 inline size-3.5" />
              {visit.vehicleTitle}
            </p>
          ) : null}
          {visit.notes ? <p>{visit.notes}</p> : null}
        </div>
        <div className="crm-whatsapp-visit-actions">
          <IconStatusButton
            disabled={!canManage || isSaving}
            icon={<Check aria-hidden="true" className="size-4" />}
            label="Confirmar visita"
            onClick={() => onStatus(visit, "confirmed")}
          />
          <IconStatusButton
            disabled={!canManage || isSaving}
            icon={<Clock aria-hidden="true" className="size-4" />}
            label="Concluir visita"
            onClick={() => onStatus(visit, "completed")}
          />
          <IconStatusButton
            disabled={!canManage || isSaving}
            icon={<X aria-hidden="true" className="size-4" />}
            label="Cancelar visita"
            onClick={() => onStatus(visit, "cancelled")}
          />
        </div>
      </div>
    </article>
  );
}

export function VisitEmpty({ label }: { label: string }) {
  return <div className="crm-whatsapp-visit-empty">{label}</div>;
}

function IconStatusButton(props: {
  disabled: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={props.label}
      className="crm-action crm-action-secondary"
      disabled={props.disabled}
      onClick={props.onClick}
      title={props.label}
      type="button"
    >
      {props.icon}
    </button>
  );
}

function statusLabel(status: LeadVisitStatus) {
  const labels: Record<LeadVisitStatus, string> = {
    cancelled: "Cancelada",
    completed: "Concluida",
    confirmed: "Confirmada",
    no_show: "Nao compareceu",
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
