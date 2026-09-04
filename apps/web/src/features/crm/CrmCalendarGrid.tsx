import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import {
  CRM_CALENDAR_WEEKDAYS,
  type CrmCalendarCell,
  type CrmCalendarWeekDay,
} from "./crmCalendarModel";

export function CrmCalendarMonthGrid<T>({
  addLabel,
  cells,
  itemLabels,
  onStartCreation,
  renderItems,
}: {
  addLabel: (cell: CrmCalendarCell<T>) => string;
  cells: CrmCalendarCell<T>[];
  itemLabels: readonly [singular: string, plural: string];
  onStartCreation?: ((date?: Date) => void) | undefined;
  renderItems: (cell: CrmCalendarCell<T>) => ReactNode;
}) {
  return (
    <div className="crm-month-grid">
      <div className="crm-month-grid-header">
        {CRM_CALENDAR_WEEKDAYS.map((day) => (
          <div className="crm-month-weekday" key={day}>
            {day}
          </div>
        ))}
      </div>
      <div className="crm-month-grid-cells">
        {cells.map((cell) => (
          <div
            className={`crm-month-cell${cell.isCurrentMonth ? "" : " is-outside"}${cell.isToday ? " is-today" : ""}`}
            key={cell.date.toISOString()}
          >
            <div className="crm-month-cell-header">
              <span
                className={`crm-month-day-number${cell.isToday ? " is-today" : ""}`}
              >
                {cell.dayNumber}
              </span>
              <div className="crm-month-cell-header-actions">
                {cell.items.length > 0 ? (
                  <span className="crm-month-day-count">
                    {cell.items.length}{" "}
                    {cell.items.length === 1 ? itemLabels[0] : itemLabels[1]}
                  </span>
                ) : null}
                {onStartCreation ? (
                  <button
                    aria-label={addLabel(cell)}
                    className="crm-month-add-slot-btn"
                    onClick={() => onStartCreation(cell.date)}
                    title={addLabel(cell)}
                    type="button"
                  >
                    <Plus aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </div>
            <div className="crm-month-cell-events">{renderItems(cell)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CrmCalendarWeekGrid<T>({
  addLabel,
  days,
  onStartCreation,
  renderItems,
}: {
  addLabel: (day: CrmCalendarWeekDay<T>) => string;
  days: CrmCalendarWeekDay<T>[];
  onStartCreation?: ((date?: Date) => void) | undefined;
  renderItems: (day: CrmCalendarWeekDay<T>) => ReactNode;
}) {
  return (
    <div className="crm-week-grid">
      {days.map((day) => (
        <div
          className={`crm-week-column${day.isToday ? " is-today" : ""}`}
          key={day.dayName}
        >
          <div className="crm-week-column-header">
            <span className="crm-week-day-name">{day.dayName}</span>
            <span
              className={`crm-week-day-number${day.isToday ? " is-today" : ""}`}
            >
              {day.dayNumber}
            </span>
            {onStartCreation ? (
              <button
                aria-label={addLabel(day)}
                className="crm-week-add-slot-btn"
                onClick={() => onStartCreation(day.date)}
                title={addLabel(day)}
                type="button"
              >
                <Plus aria-hidden="true" />
              </button>
            ) : null}
          </div>
          <div className="crm-week-column-events">{renderItems(day)}</div>
        </div>
      ))}
    </div>
  );
}
