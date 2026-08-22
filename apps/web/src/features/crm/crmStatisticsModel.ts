export type CrmStatisticsPeriodPreset = "7d" | "30d" | "month" | "custom";

export function createCrmStatisticsPresetRange(
  preset: Exclude<CrmStatisticsPeriodPreset, "custom">,
) {
  const today = new Date();
  const from = new Date(today);
  if (preset === "month") from.setDate(1);
  else from.setDate(today.getDate() - (preset === "7d" ? 6 : 29));
  return {
    from: formatCrmStatisticsInputDate(from),
    to: formatCrmStatisticsInputDate(today),
  };
}

export function addCrmStatisticsCalendarDay(value: string) {
  const date = new Date(`${value}T12:00:00-03:00`);
  date.setDate(date.getDate() + 1);
  return formatCrmStatisticsInputDate(date);
}

export function formatCrmStatisticsDay(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(`${value}T12:00:00-03:00`));
}

export function formatCrmStatisticsDuration(value: number | null) {
  if (value == null) return "—";
  const minutes = Math.round(value / 60_000);
  if (minutes === 0) return "< 1 min";
  return minutes < 60
    ? `${minutes} min`
    : `${Math.floor(minutes / 60)}h ${minutes % 60}min`;
}

export function formatCrmStatisticsInputDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export function parseCrmStatisticsInputDate(value: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}
