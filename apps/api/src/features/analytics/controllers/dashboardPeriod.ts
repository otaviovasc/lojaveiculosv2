import type { AnalyticsPeriod } from "../../../domains/analytics/ports/analyticsRepository.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Loose parsing for the dashboard `from`/`to` query params (YYYY-MM-DD).
 * Anything that is not a valid calendar date falls back to the default
 * window: the last 30 days (inclusive) ending today, in UTC.
 */
export function parseDashboardPeriod(
  query: { from?: string | undefined; to?: string | undefined },
  now: Date = new Date(),
): AnalyticsPeriod {
  const from = parseDate(query.from);
  const to = parseDate(query.to);

  if (from && to) {
    return from.getTime() <= to.getTime()
      ? { from: query.from as string, to: query.to as string }
      : { from: query.to as string, to: query.from as string };
  }

  const end = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  return {
    from: new Date(end - 29 * DAY_MS).toISOString().slice(0, 10),
    to: new Date(end).toISOString().slice(0, 10),
  };
}

function parseDate(value: string | undefined): Date | null {
  if (!value || !DATE_PATTERN.test(value)) {
    return null;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
    ? null
    : date;
}
