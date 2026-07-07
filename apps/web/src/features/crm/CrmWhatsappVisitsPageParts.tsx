import type { ReactNode } from "react";
import { CalendarCheck, Check, Clock, Link2, X } from "lucide-react";
import { crmWhatsappSessionHash } from "./crmRouteState";
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
};

export function CreateVisitPanel(props: {
  activeSession: CrmWhatsappSession | null;
  canManage: boolean;
  isSaving: boolean;
  linkedLeadId: string | null;
  notes: string;
  onCreate: () => void;
  onNotesChange: (value: string) => void;
  onScheduledAtChange: (value: string) => void;
  scheduledAt: string;
}) {
  return (
    <div className="crm-whatsapp-visit-create">
      <div className="crm-whatsapp-visit-create-heading">
        <strong>Nova visita</strong>
        {props.linkedLeadId ? (
          <div>
            <a href={`#/crm?surface=leads&leadId=${props.linkedLeadId}`}>
              Lead
            </a>
            {props.activeSession ? (
              <a href={`#${crmWhatsappSessionHash(props.activeSession.id)}`}>
                Conversa
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
      {props.linkedLeadId ? (
        <div className="crm-whatsapp-visit-create-grid">
          <input
            aria-label="Data da visita"
            onChange={(event) => props.onScheduledAtChange(event.target.value)}
            type="datetime-local"
            value={props.scheduledAt}
          />
          <input
            aria-label="Observacoes da visita"
            onChange={(event) => props.onNotesChange(event.target.value)}
            placeholder="Observacoes"
            value={props.notes}
          />
          <button
            className="crm-action crm-action-primary"
            disabled={
              !props.canManage || props.isSaving || !props.scheduledAt.trim()
            }
            onClick={props.onCreate}
            type="button"
          >
            <CalendarCheck aria-hidden="true" className="size-4" />
            Criar
          </button>
        </div>
      ) : (
        <p className="crm-whatsapp-visit-create-empty">
          Selecione uma conversa vinculada a um lead.
        </p>
      )}
    </div>
  );
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
