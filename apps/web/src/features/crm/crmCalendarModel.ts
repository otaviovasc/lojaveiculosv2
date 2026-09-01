export const CRM_CALENDAR_WEEKDAYS = [
  "DOM",
  "SEG",
  "TER",
  "QUA",
  "QUI",
  "SEX",
  "SÁB",
] as const;

export type CrmCalendarSubView = "month" | "week";

export type CrmCalendarCell<T> = {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  items: T[];
};

export type CrmCalendarWeekDay<T> = Omit<
  CrmCalendarCell<T>,
  "isCurrentMonth"
> & { dayName: string };

export function buildCrmMonthCells<T>(
  currentDate: Date,
  items: readonly T[],
  itemDate: (item: T) => Date | string,
): CrmCalendarCell<T>[] {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const startDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const totalCells = Math.ceil((startDayOfWeek + daysInMonth) / 7) * 7;
  const today = new Date().toDateString();

  return Array.from({ length: totalCells }, (_, index) => {
    let date: Date;
    let dayNumber: number;
    let isCurrentMonth: boolean;
    if (index < startDayOfWeek) {
      dayNumber = daysInPrevMonth - startDayOfWeek + index + 1;
      date = new Date(year, month - 1, dayNumber);
      isCurrentMonth = false;
    } else if (index < startDayOfWeek + daysInMonth) {
      dayNumber = index - startDayOfWeek + 1;
      date = new Date(year, month, dayNumber);
      isCurrentMonth = true;
    } else {
      dayNumber = index - (startDayOfWeek + daysInMonth) + 1;
      date = new Date(year, month + 1, dayNumber);
      isCurrentMonth = false;
    }
    const dateKey = date.toDateString();
    return {
      date,
      dayNumber,
      isCurrentMonth,
      isToday: dateKey === today,
      items: items.filter(
        (item) => new Date(itemDate(item)).toDateString() === dateKey,
      ),
    };
  });
}

export function buildCrmWeekDays<T>(
  currentDate: Date,
  items: readonly T[],
  itemDate: (item: T) => Date | string,
): CrmCalendarWeekDay<T>[] {
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
  const today = new Date().toDateString();

  return CRM_CALENDAR_WEEKDAYS.map((dayName, index) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + index);
    const dateKey = date.toDateString();
    return {
      date,
      dayName,
      dayNumber: date.getDate(),
      isToday: dateKey === today,
      items: items.filter(
        (item) => new Date(itemDate(item)).toDateString() === dateKey,
      ),
    };
  });
}

export function shiftCrmCalendarDate(
  current: Date,
  subView: CrmCalendarSubView,
  amount: -1 | 1,
) {
  const next = new Date(current);
  if (subView === "month") next.setMonth(next.getMonth() + amount);
  else next.setDate(next.getDate() + amount * 7);
  return next;
}
