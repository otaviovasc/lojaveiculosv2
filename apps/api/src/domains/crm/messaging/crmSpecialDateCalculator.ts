export type CrmSpecialDateType =
  | "birthday"
  | "blackFriday"
  | "christmas"
  | "easter"
  | "fathersDay"
  | "mothersDay"
  | "purchaseAnniversary";

export const CRM_SPECIAL_DATE_TYPES: readonly CrmSpecialDateType[] = [
  "birthday",
  "purchaseAnniversary",
  "easter",
  "christmas",
  "mothersDay",
  "fathersDay",
  "blackFriday",
] as const;

export type SpecialDateCalendarDate = {
  day: number;
  month: number; // 1-12
  year: number;
};

const BRT_TIMEZONE = "America/Sao_Paulo";
const BRT_OFFSET_HOURS = -3;

/**
 * Parses an instant into the calendar date (year, month 1-12, day) in America/Sao_Paulo.
 */
export function getSaoPauloCalendarDate(
  instant: Date,
): SpecialDateCalendarDate {
  const formatter = new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "numeric",
    timeZone: BRT_TIMEZONE,
    year: "numeric",
  });
  const parts = formatter.formatToParts(instant);
  let day = 1;
  let month = 1;
  let year = instant.getUTCFullYear();
  for (const part of parts) {
    if (part.type === "day") day = Number(part.value);
    if (part.type === "month") month = Number(part.value);
    if (part.type === "year") year = Number(part.value);
  }
  return { day, month, year };
}

/**
 * Returns true if a given year is a leap year in the Gregorian calendar.
 */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * Calculates Easter Sunday for a given year using Butcher's anonymous Gregorian algorithm.
 * Returns { month, day } (month 1-12).
 */
export function calculateEaster(year: number): { day: number; month: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { day, month };
}

/**
 * Calculates the Nth occurrence of a weekday in a given month.
 * weekday: 0=Sunday, 1=Monday, ..., 5=Friday, 6=Saturday.
 * n: 1-indexed (e.g. 2 for 2nd Sunday).
 */
export function calculateNthWeekdayOfMonth(
  year: number,
  month: number, // 1-12
  weekday: number, // 0-6
  n: number,
): number {
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const firstDayWeekday = firstDay.getUTCDay();
  const daysToFirst = (weekday - firstDayWeekday + 7) % 7;
  return 1 + daysToFirst + (n - 1) * 7;
}

/**
 * Returns the calendar date (month 1-12, day) for fixed or movable annual occasions in a given year.
 */
export function getAnnualOccasionDate(
  dateType: CrmSpecialDateType,
  year: number,
): { day: number; month: number } | null {
  switch (dateType) {
    case "christmas":
      return { day: 25, month: 12 };
    case "easter":
      return calculateEaster(year);
    case "mothersDay":
      return { day: calculateNthWeekdayOfMonth(year, 5, 0, 2), month: 5 };
    case "fathersDay":
      return { day: calculateNthWeekdayOfMonth(year, 8, 0, 2), month: 8 };
    case "blackFriday":
      // Day after 4th Thursday of November (4th Thursday + 1 day; can be 5th Friday)
      return {
        day: calculateNthWeekdayOfMonth(year, 11, 4, 4) + 1,
        month: 11,
      };
    case "birthday":
    case "purchaseAnniversary":
    default:
      return null;
  }
}

/**
 * Deterministically computes the scheduled instant in UTC for sending a special date message on referenceDate.
 * sendTime format: "HH:mm" in America/Sao_Paulo (e.g. "09:00" or "00:00").
 * Converts from UTC-3 (BRT) to UTC without timezone ambiguity, correctly preserving 00:00 (midnight).
 */
export function calculateSendInstantUtc(
  referenceDate: Date,
  sendTime = "09:00",
): Date {
  const calendar = getSaoPauloCalendarDate(referenceDate);
  const [hoursStr, minutesStr] = sendTime.split(":");
  const parsedHours = Number(hoursStr);
  const hours =
    !Number.isNaN(parsedHours) && parsedHours >= 0 && parsedHours <= 23
      ? parsedHours
      : 9;
  const parsedMinutes = Number(minutesStr);
  const minutes =
    !Number.isNaN(parsedMinutes) && parsedMinutes >= 0 && parsedMinutes <= 59
      ? parsedMinutes
      : 0;

  // America/Sao_Paulo is UTC-3 year-round (Brazil abolished DST in 2019)
  // BRT hours + 3 = UTC hours
  const utcHours = hours - BRT_OFFSET_HOURS;
  return new Date(
    Date.UTC(
      calendar.year,
      calendar.month - 1,
      calendar.day,
      utcHours,
      minutes,
      0,
      0,
    ),
  );
}

/**
 * Validates that a string is a strictly valid ISO calendar date (YYYY-MM-DD),
 * has a valid day for its specific month and year (including Gregorian leap year Feb 29),
 * and is not in the future relative to today's Sao Paulo calendar date.
 */
export function isValidIsoCalendarBirthDate(value: string): boolean {
  if (!isValidIsoCalendarDate(value)) return false;
  const year = Number(value.slice(0, 4));
  if (year < 1900) return false;
  const date = parseIsoCalendarDate(value);
  if (!date) return false;
  const today = getSaoPauloCalendarDate(new Date());
  const todayInUtc = Date.UTC(today.year, today.month - 1, today.day);
  if (date.getTime() > todayInUtc) {
    return false;
  }
  return true;
}

/**
 * Validates a date-only ISO value without applying the birth-date policy.
 * This is used by workers when reading persisted values so malformed legacy
 * data cannot roll over into a different calendar day.
 */
export function isValidIsoCalendarDate(value: string): boolean {
  return parseIsoCalendarDate(value) !== null;
}

function parseIsoCalendarDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [yearStr, monthStr, dayStr] = value.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export {
  isBirthdayWithinLeadWindow,
  isOccasionWithinLeadWindow,
  isPurchaseAnniversaryWithinLeadWindow,
} from "./crmSpecialDateLeadWindows.js";
