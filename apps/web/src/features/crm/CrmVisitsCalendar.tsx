import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { CrmLeadVisit, LeadVisitStatus } from "./crmVisitsApi";
import {
  CrmVisitDetailDialog,
  MonthGridView,
  WeekGridView,
} from "./CrmVisitsCalendarViews";
import { useCrmCalendarView } from "./useCrmCalendarNavigation";

export function CrmVisitsCalendar({
  canManage,
  isSaving,
  onStartCreation,
  onStatus,
  visits,
}: {
  canManage: boolean;
  isSaving: boolean;
  onStartCreation?: ((date?: Date) => void) | undefined;
  onStatus: (visit: CrmLeadVisit, status: LeadVisitStatus) => void;
  visits: CrmLeadVisit[];
}) {
  const visitCalendar = useCrmCalendarView(visits);

  return (
    <div className="crm-visits-calendar">
      {/* Calendar Toolbar */}
      <div className="crm-calendar-toolbar">
        <div className="crm-calendar-nav">
          <button
            className="crm-calendar-today-btn"
            onClick={visitCalendar.goToToday}
            type="button"
          >
            Hoje
          </button>
          <div className="crm-calendar-arrows">
            <button
              aria-label="Mês anterior"
              className="crm-calendar-nav-btn"
              onClick={visitCalendar.goToPreviousPeriod}
              title="Anterior"
              type="button"
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <button
              aria-label="Próximo mês"
              className="crm-calendar-nav-btn"
              onClick={visitCalendar.goToNextPeriod}
              title="Próximo"
              type="button"
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
          <h3 className="crm-calendar-title">
            {visitCalendar.capitalizedMonthLabel}
          </h3>
        </div>

        <div className="crm-calendar-controls">
          <div className="crm-calendar-filter-pills">
            <button
              className={`crm-calendar-filter-btn${visitCalendar.statusFilter === "all" ? " active" : ""}`}
              onClick={() => visitCalendar.setStatusFilter("all")}
              type="button"
            >
              Todos ({visits.length})
            </button>
            <button
              className={`crm-calendar-filter-btn${visitCalendar.statusFilter === "scheduled" ? " active" : ""}`}
              data-status="scheduled"
              onClick={() => visitCalendar.setStatusFilter("scheduled")}
              type="button"
            >
              Agendadas
            </button>
            <button
              className={`crm-calendar-filter-btn${visitCalendar.statusFilter === "confirmed" ? " active" : ""}`}
              data-status="confirmed"
              onClick={() => visitCalendar.setStatusFilter("confirmed")}
              type="button"
            >
              Confirmadas
            </button>
            <button
              className={`crm-calendar-filter-btn${visitCalendar.statusFilter === "completed" ? " active" : ""}`}
              data-status="completed"
              onClick={() => visitCalendar.setStatusFilter("completed")}
              type="button"
            >
              Concluídas
            </button>
          </div>

          <div className="crm-calendar-view-toggle">
            <button
              className={`crm-calendar-toggle-btn${visitCalendar.subView === "month" ? " active" : ""}`}
              onClick={() => visitCalendar.setSubView("month")}
              type="button"
            >
              Mês
            </button>
            <button
              className={`crm-calendar-toggle-btn${visitCalendar.subView === "week" ? " active" : ""}`}
              onClick={() => visitCalendar.setSubView("week")}
              type="button"
            >
              Semana
            </button>
          </div>
        </div>
      </div>

      {/* Empty State Banner when no visits in system */}
      {visits.length === 0 ? (
        <div className="crm-visit-empty" role="status">
          <span aria-hidden="true" className="crm-visit-empty-icon">
            <CalendarIcon />
          </span>
          <strong>Nenhuma visita nesta visao.</strong>
          <p>
            Clique em "Nova visita" ou selecione um dia no calendário para
            agendar.
          </p>
        </div>
      ) : null}

      {/* Calendar Body */}
      {visitCalendar.subView === "month" ? (
        <MonthGridView
          currentDate={visitCalendar.currentDate}
          onSelectVisit={visitCalendar.setSelectedItem}
          onStartCreation={onStartCreation}
          visits={visitCalendar.filteredItems}
        />
      ) : (
        <WeekGridView
          currentDate={visitCalendar.currentDate}
          onSelectVisit={visitCalendar.setSelectedItem}
          onStartCreation={onStartCreation}
          visits={visitCalendar.filteredItems}
        />
      )}

      {/* Detail Dialog */}
      {visitCalendar.selectedItem ? (
        <CrmVisitDetailDialog
          canManage={canManage}
          isSaving={isSaving}
          onClose={() => visitCalendar.setSelectedItem(null)}
          onStatus={(visit, status) => {
            onStatus(visit, status);
            visitCalendar.setSelectedItem((curr) =>
              curr ? { ...curr, status } : null,
            );
          }}
          visit={visitCalendar.selectedItem}
        />
      ) : null}
    </div>
  );
}
