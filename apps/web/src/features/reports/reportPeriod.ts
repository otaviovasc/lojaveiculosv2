import type { ReportsPeriod, ReportTab } from "./types";

export type PeriodPreset = "7d" | "30d" | "90d" | "month" | "custom";

export type ReportsViewState = {
  compare: boolean;
  customPeriod: ReportsPeriod;
  preset: PeriodPreset;
  search: string;
  tab: ReportTab;
};

const reportTabs = new Set<ReportTab>([
  "summary",
  "sold",
  "costs",
  "finance",
  "crm",
  "inventory",
  "documents",
  "marketing",
]);

const presets = new Set<PeriodPreset>(["7d", "30d", "90d", "month", "custom"]);

export function readReportsViewState(now = new Date()): ReportsViewState {
  const fallbackPeriod = computePeriod("30d", now);
  if (typeof window === "undefined") {
    return {
      compare: false,
      customPeriod: fallbackPeriod,
      preset: "30d",
      search: "",
      tab: "summary",
    };
  }
  const params = new URLSearchParams(window.location.search);
  const rawTab = params.get("tab");
  const rawPreset = params.get("period");
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const validCustom =
    isValidReportDate(from) && isValidReportDate(to) && from <= to;
  const preset =
    rawPreset && presets.has(rawPreset as PeriodPreset)
      ? (rawPreset as PeriodPreset)
      : validCustom
        ? "custom"
        : "30d";
  return {
    compare: params.get("compare") === "1",
    customPeriod: validCustom ? { from, to } : fallbackPeriod,
    preset: preset === "custom" && !validCustom ? "30d" : preset,
    search: params.get("q") ?? "",
    tab:
      rawTab && reportTabs.has(rawTab as ReportTab)
        ? (rawTab as ReportTab)
        : "summary",
  };
}

export function syncReportsViewState(state: ReportsViewState) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  params.set("tab", state.tab);
  params.set("period", state.preset);
  if (state.preset === "custom" && isValidPeriod(state.customPeriod)) {
    params.set("from", state.customPeriod.from);
    params.set("to", state.customPeriod.to);
  } else {
    params.delete("from");
    params.delete("to");
  }
  state.compare ? params.set("compare", "1") : params.delete("compare");
  state.search ? params.set("q", state.search) : params.delete("q");
  const query = params.toString();
  const nextSearch = query ? `?${query}` : "";
  const nextUrl = `${window.location.pathname}${nextSearch}${window.location.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (nextUrl !== currentUrl) {
    window.history.replaceState(null, "", nextUrl);
  }
}

export function resolvePeriod(state: ReportsViewState, now = new Date()) {
  return state.preset === "custom"
    ? state.customPeriod
    : computePeriod(state.preset, now);
}

export function computePeriod(
  preset: Exclude<PeriodPreset, "custom">,
  now = new Date(),
): ReportsPeriod {
  const to = formatDate(now);
  if (preset === "month") {
    return {
      from: formatDate(new Date(now.getFullYear(), now.getMonth(), 1)),
      to,
    };
  }
  const days = preset === "7d" ? 7 : preset === "90d" ? 90 : 30;
  const from = new Date(now);
  from.setDate(from.getDate() - (days - 1));
  return { from: formatDate(from), to };
}

export function previousPeriod(period: ReportsPeriod): ReportsPeriod {
  const from = Date.parse(`${period.from}T00:00:00.000Z`);
  const to = Date.parse(`${period.to}T00:00:00.000Z`);
  const duration = to - from;
  return {
    from: new Date(from - duration - 86_400_000).toISOString().slice(0, 10),
    to: new Date(from - 86_400_000).toISOString().slice(0, 10),
  };
}

export function formatPeriod(period: ReportsPeriod) {
  return `${formatBrazilianDate(period.from)} a ${formatBrazilianDate(period.to)}`;
}

export function isValidPeriod(period: ReportsPeriod) {
  return (
    isValidReportDate(period.from) &&
    isValidReportDate(period.to) &&
    period.from <= period.to
  );
}

export function isValidReportDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatBrazilianDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}
