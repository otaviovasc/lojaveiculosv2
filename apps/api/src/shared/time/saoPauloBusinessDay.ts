export const SAO_PAULO_TIME_ZONE = "America/Sao_Paulo";

const searchWindowMs = 18 * 60 * 60 * 1000;
const oneDayMs = 24 * 60 * 60 * 1000;
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  calendar: "iso8601",
  day: "2-digit",
  month: "2-digit",
  numberingSystem: "latn",
  timeZone: SAO_PAULO_TIME_ZONE,
  year: "numeric",
});

export type BusinessDayPeriod = { from: string; to: string };

export function saoPauloBusinessDayRange(period: BusinessDayPeriod) {
  return {
    from: saoPauloBusinessDayStart(period.from),
    toExclusive: saoPauloBusinessDayStart(addCalendarDay(period.to)),
  };
}

export function saoPauloBusinessDayStart(day: string): string {
  const utcMidnight = parseDateOnly(day);
  let lower = utcMidnight - searchWindowMs;
  let upper = utcMidnight + searchWindowMs;

  // A local calendar date is monotonic across this bounded window, including
  // offset transitions. Find its first representable instant instead of
  // assuming a fixed UTC offset or a 24-hour business day.
  while (lower < upper) {
    const middle = lower + Math.floor((upper - lower) / 2);
    if (formatLocalDate(middle) < day) lower = middle + 1;
    else upper = middle;
  }

  if (formatLocalDate(lower) !== day) {
    throw new RangeError(
      `No São Paulo business-day boundary exists for ${day}.`,
    );
  }
  return new Date(lower).toISOString();
}

function addCalendarDay(day: string): string {
  return new Date(parseDateOnly(day) + oneDayMs).toISOString().slice(0, 10);
}

function formatLocalDate(timestamp: number): string {
  const parts = new Map(
    dateFormatter
      .formatToParts(new Date(timestamp))
      .map((part) => [part.type, part.value]),
  );
  return `${parts.get("year")}-${parts.get("month")}-${parts.get("day")}`;
}

function parseDateOnly(day: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  if (!match) throw new RangeError(`Invalid date-only value: ${day}.`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const date = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, date);
  const parsed = new Date(timestamp);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== date
  ) {
    throw new RangeError(`Invalid date-only value: ${day}.`);
  }
  return timestamp;
}
