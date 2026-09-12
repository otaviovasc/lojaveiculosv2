import type { AgencyStatsPeriod, AgencyStatsReport } from "../apiClient";

const DAY_MS = 24 * 60 * 60 * 1000;

export function defaultAgencyStatsPeriod(
  now: Date = new Date(),
): AgencyStatsPeriod {
  const to = localDate(now);
  const fromDate = new Date(now);
  fromDate.setTime(fromDate.getTime() - 29 * DAY_MS);
  return { from: localDate(fromDate), to };
}

export function periodForDays(days: number, now: Date = new Date()) {
  const to = localDate(now);
  const fromDate = new Date(now);
  fromDate.setTime(fromDate.getTime() - (days - 1) * DAY_MS);
  return { from: localDate(fromDate), to };
}

export function readAgencyStatsFilters(
  searchParams: URLSearchParams,
  now: Date = new Date(),
) {
  const fallback = defaultAgencyStatsPeriod(now);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const period =
    isDate(from) && isDate(to) && from <= to ? { from, to } : fallback;
  return {
    period,
    storeId: searchParams.get("storeId") || undefined,
  };
}

export function reportHasActivity(report: AgencyStatsReport) {
  return (
    report.totals.leads.totalCount > 0 ||
    report.totals.sales.closedCount > 0 ||
    report.totals.inventory.totalListings > 0
  );
}

export function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    currency: "BRL",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(cents / 100);
}

export function number(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function percent(value: number) {
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value)}%`;
}

export function formatPeriod(period: AgencyStatsPeriod) {
  return `${formatDate(period.from)} a ${formatDate(period.to)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00.000Z`),
  );
}

function localDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}
