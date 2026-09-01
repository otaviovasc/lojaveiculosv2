import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type {
  CrmConversationCycle,
  CrmScheduledMessage,
} from "./crmConversationTypes";
import {
  CrmScheduleDetailDialog,
  MonthGridView,
  WeekGridView,
} from "./CrmSchedulesCalendarViews";
import { useCrmCalendarView } from "./useCrmCalendarNavigation";

export function CrmSchedulesCalendar({
  canCancel,
  canEdit,
  conversationCycles,
  isCancelling,
  onCancel,
  onEdit,
  onStartCreation,
  messages,
}: {
  canCancel: boolean;
  canEdit: boolean;
  conversationCycles?: CrmConversationCycle[] | undefined;
  isCancelling?: boolean;
  onCancel: (id: string) => Promise<void>;
  onEdit: (message: CrmScheduledMessage) => void;
  onStartCreation?: ((date?: Date) => void) | undefined;
  messages: CrmScheduledMessage[];
}) {
  const scheduleCalendar = useCrmCalendarView(messages);

  return (
    <div className="crm-visits-calendar crm-schedules-calendar">
      {/* Calendar Toolbar */}
      <div className="crm-calendar-toolbar">
        <div className="crm-calendar-nav">
          <button
            className="crm-calendar-today-btn"
            onClick={scheduleCalendar.goToToday}
            type="button"
          >
            Hoje
          </button>
          <div className="crm-calendar-arrows">
            <button
              aria-label="Mês anterior"
              className="crm-calendar-nav-btn"
              onClick={scheduleCalendar.goToPreviousPeriod}
              title="Anterior"
              type="button"
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <button
              aria-label="Próximo mês"
              className="crm-calendar-nav-btn"
              onClick={scheduleCalendar.goToNextPeriod}
              title="Próximo"
              type="button"
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
          <h3 className="crm-calendar-title">
            {scheduleCalendar.capitalizedMonthLabel}
          </h3>
        </div>

        <div className="crm-calendar-controls">
          <div className="crm-calendar-filter-pills">
            <button
              className={`crm-calendar-filter-btn${
                scheduleCalendar.statusFilter === "all" ? " active" : ""
              }`}
              onClick={() => scheduleCalendar.setStatusFilter("all")}
              type="button"
            >
              Todos ({messages.length})
            </button>
            <button
              className={`crm-calendar-filter-btn${
                scheduleCalendar.statusFilter === "pending" ? " active" : ""
              }`}
              data-status="pending"
              onClick={() => scheduleCalendar.setStatusFilter("pending")}
              type="button"
            >
              Pendentes
            </button>
            <button
              className={`crm-calendar-filter-btn${
                scheduleCalendar.statusFilter === "sent" ? " active" : ""
              }`}
              data-status="sent"
              onClick={() => scheduleCalendar.setStatusFilter("sent")}
              type="button"
            >
              Enviadas
            </button>
            <button
              className={`crm-calendar-filter-btn${
                scheduleCalendar.statusFilter === "failed" ? " active" : ""
              }`}
              data-status="failed"
              onClick={() => scheduleCalendar.setStatusFilter("failed")}
              type="button"
            >
              Falhas
            </button>
          </div>

          <div className="crm-calendar-view-toggle">
            <button
              className={`crm-calendar-toggle-btn${
                scheduleCalendar.subView === "month" ? " active" : ""
              }`}
              onClick={() => scheduleCalendar.setSubView("month")}
              type="button"
            >
              Mês
            </button>
            <button
              className={`crm-calendar-toggle-btn${
                scheduleCalendar.subView === "week" ? " active" : ""
              }`}
              onClick={() => scheduleCalendar.setSubView("week")}
              type="button"
            >
              Semana
            </button>
          </div>
        </div>
      </div>

      {/* Empty State Banner when no messages in system */}
      {messages.length === 0 ? (
        <div className="crm-visit-empty" role="status">
          <span aria-hidden="true" className="crm-visit-empty-icon">
            <CalendarIcon />
          </span>
          <strong>Nenhum agendamento nesta visão.</strong>
          <p>
            Clique em "Novo agendamento" ou selecione um dia no calendário para
            programar um envio.
          </p>
        </div>
      ) : null}

      {/* Calendar Body */}
      {scheduleCalendar.subView === "month" ? (
        <MonthGridView
          conversationCycles={conversationCycles}
          currentDate={scheduleCalendar.currentDate}
          messages={scheduleCalendar.filteredItems}
          onSelectMessage={scheduleCalendar.setSelectedItem}
          onStartCreation={onStartCreation}
        />
      ) : (
        <WeekGridView
          conversationCycles={conversationCycles}
          currentDate={scheduleCalendar.currentDate}
          messages={scheduleCalendar.filteredItems}
          onSelectMessage={scheduleCalendar.setSelectedItem}
          onStartCreation={onStartCreation}
        />
      )}

      {/* Detail Dialog */}
      {scheduleCalendar.selectedItem ? (
        <CrmScheduleDetailDialog
          canCancel={canCancel}
          canEdit={canEdit}
          conversationCycles={conversationCycles}
          isCancelling={Boolean(isCancelling)}
          message={scheduleCalendar.selectedItem}
          onCancel={onCancel}
          onClose={() => scheduleCalendar.setSelectedItem(null)}
          onEdit={onEdit}
        />
      ) : null}
    </div>
  );
}
