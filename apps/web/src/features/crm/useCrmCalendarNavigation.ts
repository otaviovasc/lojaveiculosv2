import { useState } from "react";
import {
  shiftCrmCalendarDate,
  type CrmCalendarSubView,
} from "./crmCalendarModel";

export function useCrmCalendarNavigation() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [subView, setSubView] = useState<CrmCalendarSubView>("month");

  return {
    currentDate,
    goToNextPeriod: () =>
      setCurrentDate((current) => shiftCrmCalendarDate(current, subView, 1)),
    goToPreviousPeriod: () =>
      setCurrentDate((current) => shiftCrmCalendarDate(current, subView, -1)),
    goToToday: () => setCurrentDate(new Date()),
    setSubView,
    subView,
  };
}

export function useCrmCalendarView<T extends { status: string }>(
  items: readonly T[],
) {
  const navigation = useCrmCalendarNavigation();
  const [selectedItem, setSelectedItem] = useState<T | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const filteredItems = items.filter(
    (item) => statusFilter === "all" || item.status === statusFilter,
  );
  const monthLabel = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(navigation.currentDate);

  return {
    ...navigation,
    capitalizedMonthLabel:
      monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
    filteredItems,
    selectedItem,
    setSelectedItem,
    setStatusFilter,
    statusFilter,
  };
}
