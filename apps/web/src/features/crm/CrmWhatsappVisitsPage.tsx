import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
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
  completed: "Concluidas",
  overdue: "Atrasadas",
  today: "Hoje",
  upcoming: "Proximas",
};

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
      <div className="flex flex-col gap-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-xs font-black uppercase tracking-wide text-muted">
              Visitas
            </span>
            <h2 className="text-lg font-black text-app-text">
              Agenda comercial
            </h2>
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

        {error ? (
          <p className="text-sm font-black text-danger">{error}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(viewLabels) as VisitView[]).map((view) => (
            <button
              aria-pressed={activeView === view}
              className={
                "rounded-lg border px-3 py-2 text-xs font-black transition-colors " +
                (activeView === view
                  ? "border-primary/40 bg-primary/10 text-app-text"
                  : "border-line/35 bg-panel/10 text-muted hover:text-app-text")
              }
              key={view}
              onClick={() => setActiveView(view)}
              type="button"
            >
              {viewLabels[view]}
            </button>
          ))}
        </div>

        <div className="grid gap-3">
          {isLoading ? (
            <VisitEmpty label="Carregando visitas." />
          ) : viewVisits.length ? (
            viewVisits.map((visit) => (
              <VisitRow
                canManage={canManage}
                isSaving={isSaving}
                key={visit.id}
                onStatus={(visit, status) => void changeStatus(visit, status)}
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

function visitMatchesView(visit: CrmLeadVisit, view: VisitView) {
  const scheduled = new Date(visit.scheduledAt);
  const now = new Date();
  const isClosed = ["cancelled", "completed", "no_show"].includes(visit.status);
  if (view === "completed") return isClosed;
  if (isClosed) return false;
  if (view === "today") return isSameDay(scheduled, now);
  if (view === "overdue") return scheduled < startOfDay(now);
  return scheduled >= startOfTomorrow(now);
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
