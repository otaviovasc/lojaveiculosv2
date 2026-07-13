import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarCheck, Plus, RefreshCw } from "lucide-react";
import { formatApiErrorDisplay } from "../../lib/apiErrors";
import type { CrmLeadVisit, LeadVisitStatus } from "./crmVisitsApi";
import { createRuntimeCrmVisitsApi } from "./crmVisitsRuntimeApi";
import {
  isVisitScheduleValid,
  visitCreationSteps,
  VisitCreationStep,
} from "./CrmWhatsappVisitCreation";
import {
  countVisitsByView,
  type CrmWhatsappVisitsPageProps,
  type VisitView,
  VisitBoard,
  visitsForView,
  visitViewOrder,
} from "./CrmWhatsappVisitsPageParts";
import {
  CrmWhatsappModeBar,
  CrmWhatsappWorkflowFooter,
  CrmWhatsappWorkflowStepper,
} from "./CrmWhatsappWorkflow";

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
  const [mode, setMode] = useState<"create" | "list">("list");
  const [notes, setNotes] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [step, setStep] = useState(0);
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

  const resetCreation = () => {
    setMode("list");
    setNotes("");
    setScheduledAt("");
    setStep(0);
    setError(null);
  };

  const startCreation = () => {
    setMode("create");
    setNotes("");
    setScheduledAt("");
    setStep(0);
    setError(null);
  };

  const createVisit = async () => {
    if (
      !linkedLeadId ||
      !isVisitScheduleValid(scheduledAt) ||
      !canManage ||
      isSaving
    ) {
      return;
    }
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
      const createdView = visitViewOrder.find(
        (view) => visitsForView([visit], view).length,
      );
      setActiveView(createdView ?? "upcoming");
      resetCreation();
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

  const viewCounts = countVisitsByView(visits);
  const viewVisits = visitsForView(visits, activeView);
  const nextDisabled =
    !canManage ||
    !linkedLeadId ||
    (step > 0 && !isVisitScheduleValid(scheduledAt));

  return (
    <section className="crm-whatsapp-section">
      <div className="crm-whatsapp-visits-page">
        <CrmWhatsappModeBar
          actions={
            mode === "list" ? (
              <>
                <button
                  aria-label="Atualizar visitas"
                  className="crm-icon-action"
                  disabled={isLoading}
                  onClick={() => void refresh()}
                  title="Atualizar visitas"
                  type="button"
                >
                  <RefreshCw aria-hidden="true" />
                </button>
                <button
                  className="crm-action"
                  disabled={!canManage}
                  onClick={startCreation}
                  type="button"
                >
                  <Plus aria-hidden="true" />
                  Nova visita
                </button>
              </>
            ) : null
          }
          summary={
            mode === "list"
              ? `${visits.length} visitas carregadas`
              : `Passo ${step + 1} de ${visitCreationSteps.length}`
          }
        >
          <span className="crm-whatsapp-mode-label">
            <CalendarCheck aria-hidden="true" />
            {mode === "list" ? "Agenda operacional" : "Novo agendamento"}
          </span>
        </CrmWhatsappModeBar>

        {mode === "create" ? (
          <div className="crm-whatsapp-workflow">
            <CrmWhatsappWorkflowStepper
              currentStep={step}
              onStepChange={setStep}
              steps={visitCreationSteps}
            />
            <div className="crm-whatsapp-visit-workflow-main">
              {error ? (
                <p className="crm-whatsapp-visits-error" role="alert">
                  {error}
                </p>
              ) : null}
              <VisitCreationStep
                activeSession={activeSession}
                notes={notes}
                onNotesChange={setNotes}
                onScheduledAtChange={setScheduledAt}
                scheduledAt={scheduledAt}
                step={step}
              />
            </div>
            <CrmWhatsappWorkflowFooter
              backDisabled={step === 0}
              confirmIcon={<CalendarCheck aria-hidden="true" />}
              confirmLabel="Criar visita"
              isBusy={isSaving}
              isLastStep={step === visitCreationSteps.length - 1}
              nextDisabled={nextDisabled}
              onBack={() => setStep((current) => Math.max(0, current - 1))}
              onCancel={resetCreation}
              onNext={() =>
                step === visitCreationSteps.length - 1
                  ? void createVisit()
                  : setStep((current) => current + 1)
              }
            />
          </div>
        ) : (
          <VisitBoard
            activeView={activeView}
            canManage={canManage}
            error={error}
            isLoading={isLoading}
            isSaving={isSaving}
            onStatus={(visit, status) => void changeStatus(visit, status)}
            onViewChange={setActiveView}
            viewCounts={viewCounts}
            visits={viewVisits}
          />
        )}
      </div>
    </section>
  );
}
