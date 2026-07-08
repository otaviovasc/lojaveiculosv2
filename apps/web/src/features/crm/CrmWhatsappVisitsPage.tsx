import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarCheck, RefreshCw } from "lucide-react";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { CrmLeadVisit, LeadVisitStatus } from "./crmVisitsApi";
import { createRuntimeCrmVisitsApi } from "./crmVisitsRuntimeApi";
import {
  CreateVisitPanel,
  type CrmWhatsappVisitsPageProps,
  type VisitView,
  VisitEmpty,
  VisitRow,
} from "./CrmWhatsappVisitsPageParts";

const viewLabels: Record<VisitView, string> = {
  today: "Hoje",
  tomorrow: "Amanha",
  upcoming: "Proximas",
  overdue: "Atrasadas",
  completed: "Concluidas",
};
const viewOrder = Object.keys(viewLabels) as VisitView[];

export function CrmWhatsappVisitsPage({
  activeSession,
  api,
  canManage,
  canRead,
}: CrmWhatsappVisitsPageProps) {
  const visitsApi = useMemo(() => api ?? createRuntimeCrmVisitsApi(), [api]);
  const [activeView, setActiveView] = useState<VisitView>("today");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notes, setNotes] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [visits, setVisits] = useState<CrmLeadVisit[]>([]);
  const linkedLeadId = activeSession?.leadId ?? null;

  const refresh = useCallback(async () => {
    if (!canRead) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      setVisits(await visitsApi.listVisits({ limit: 100 }));
    } catch (caught) {
      setError(
        formatApiErrorDisplay(caught, "Nao foi possivel carregar visitas."),
      );
    } finally {
      setIsLoading(false);
    }
  }, [canRead, visitsApi]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const viewVisits = useMemo(
    () => visits.filter((visit) => visitMatchesView(visit, activeView)),
    [activeView, visits],
  );
  const viewCounts = useMemo(
    () =>
      Object.fromEntries(
        (Object.keys(viewLabels) as VisitView[]).map((view) => [
          view,
          visits.filter((visit) => visitMatchesView(visit, view)).length,
        ]),
      ) as Record<VisitView, number>,
    [visits],
  );

  const createVisit = async () => {
    if (!linkedLeadId || !scheduledAt || !canManage || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const visit = await visitsApi.createVisit({
        leadId: linkedLeadId,
        notes: notes.trim() || null,
        scheduledAt: new Date(scheduledAt).toISOString(),
        ...(typeof activeSession?.id === "string"
          ? { sessionId: activeSession.id }
          : {}),
      });
      setVisits((current) => [visit, ...current]);
      setNotes("");
      setScheduledAt("");
    } catch (caught) {
      setError(formatApiErrorDisplay(caught, "Nao foi possivel criar visita."));
    } finally {
      setIsSaving(false);
    }
  };

  const changeStatus = async (visit: CrmLeadVisit, status: LeadVisitStatus) => {
    if (!canManage || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const next =
        status === "cancelled"
          ? await visitsApi.cancelVisit(visit.id)
          : status === "completed"
            ? await visitsApi.completeVisit(visit.id)
            : await visitsApi.updateVisit(visit.id, { status });
      setVisits((current) =>
        current.map((item) => (item.id === next.id ? next : item)),
      );
    } catch (caught) {
      setError(
        formatApiErrorDisplay(caught, "Nao foi possivel atualizar visita."),
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!canRead) {
    return (
      <section className="crm-whatsapp-section">
        <p className="text-sm font-bold text-muted">
          Seu usuario nao tem permissao para visualizar visitas.
        </p>
      </section>
    );
  }

  return (
    <section className="crm-whatsapp-section">
      <div className="crm-whatsapp-visits-page">
        <header className="crm-whatsapp-visits-header">
          <span aria-hidden="true">
            <CalendarCheck className="size-5" />
          </span>
          <div>
            <strong>Visitas</strong>
            <h2>Visitas agendadas</h2>
            <p>
              Concentre as visitas do CRM em uma linha do tempo operacional.
            </p>
          </div>
          <button
            className="crm-action crm-action-secondary"
            disabled={isLoading}
            onClick={() => void refresh()}
            type="button"
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            Atualizar
          </button>
        </header>

        <div className="crm-whatsapp-visits-layout">
          <CreateVisitPanel
            activeSession={activeSession}
            canManage={canManage}
            isSaving={isSaving}
            linkedLeadId={linkedLeadId}
            notes={notes}
            onCreate={() => void createVisit()}
            onNotesChange={setNotes}
            onScheduledAtChange={setScheduledAt}
            scheduledAt={scheduledAt}
          />

          <section className="crm-whatsapp-visits-board">
            {error ? (
              <p className="crm-whatsapp-visits-error">{error}</p>
            ) : null}

            <div className="crm-whatsapp-visits-filters">
              {viewOrder.map((view) => (
                <button
                  aria-pressed={activeView === view}
                  className={
                    activeView === view
                      ? "crm-whatsapp-visits-filter crm-whatsapp-visits-filter-active"
                      : "crm-whatsapp-visits-filter"
                  }
                  key={view}
                  onClick={() => setActiveView(view)}
                  type="button"
                >
                  {viewLabels[view]}
                  <span>{viewCounts[view]}</span>
                </button>
              ))}
            </div>

            <div className="crm-whatsapp-visits-group">
              <header>
                <span />
                <h3>{viewLabels[activeView]}</h3>
              </header>
              <div className="crm-whatsapp-visits-timeline">
                {isLoading ? (
                  <VisitEmpty label="Carregando visitas." />
                ) : viewVisits.length ? (
                  viewVisits.map((visit) => (
                    <VisitRow
                      canManage={canManage}
                      isSaving={isSaving}
                      key={visit.id}
                      onStatus={(visit, status) =>
                        void changeStatus(visit, status)
                      }
                      visit={visit}
                    />
                  ))
                ) : (
                  <VisitEmpty label="Nenhuma visita nesta visao." />
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>
  );
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
