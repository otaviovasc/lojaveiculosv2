import type { ReactNode } from "react";
import { CalendarCheck, Check, Clock, X } from "lucide-react";
import { crmWhatsappSessionHash } from "./crmRouteState";
import type { CrmWhatsappSession } from "./crmWhatsappTypes";
import type {
  CrmLeadVisit,
  CrmVisitsApi,
  LeadVisitStatus,
} from "./crmVisitsApi";

export type VisitView = "completed" | "overdue" | "today" | "upcoming";

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
    <div className="rounded-xl border border-line/35 bg-panel/10 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <strong className="text-sm font-black text-app-text">
          Nova visita
        </strong>
        {props.linkedLeadId ? (
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
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
        <div className="grid gap-3 md:grid-cols-[220px_1fr_auto]">
          <input
            aria-label="Data da visita"
            className="rounded-lg border border-line/35 bg-app px-3 py-2 text-sm font-bold text-app-text outline-none"
            onChange={(event) => props.onScheduledAtChange(event.target.value)}
            type="datetime-local"
            value={props.scheduledAt}
          />
          <input
            aria-label="Observacoes da visita"
            className="rounded-lg border border-line/35 bg-app px-3 py-2 text-sm font-bold text-app-text outline-none"
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
        <p className="text-xs font-bold text-muted">
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
    <article className="rounded-xl border border-line/35 bg-panel/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <strong className="text-sm font-black text-app-text">
            {formatDateTime(visit.scheduledAt)}
          </strong>
          <p className="mt-1 text-xs font-bold text-muted">
            {statusLabel(visit.status)} · Lead {visit.leadId}
          </p>
          {visit.notes ? (
            <p className="mt-2 text-sm font-bold text-app-text">
              {visit.notes}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            className="crm-action crm-action-secondary"
            href={`#/crm?surface=leads&leadId=${visit.leadId}`}
          >
            Lead
          </a>
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
  return (
    <div className="rounded-xl border border-dashed border-line/35 bg-panel/5 p-8 text-center text-sm font-bold text-muted">
      {label}
    </div>
  );
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
