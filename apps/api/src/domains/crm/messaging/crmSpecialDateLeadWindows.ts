import {
  getAnnualOccasionDate,
  getSaoPauloCalendarDate,
  isValidIsoCalendarDate,
  isLeapYear,
  type CrmSpecialDateType,
} from "./crmSpecialDateCalculator.js";

/**
 * Evaluates whether an annual occasion (holiday) matches today or is active within the leadDays window.
 * Window: [occasion - leadDays, occasion].
 */
export function isOccasionWithinLeadWindow(
  dateType: CrmSpecialDateType,
  referenceDate: Date,
  leadDays = 0,
): { active: boolean; targetYear: number } {
  const current = getSaoPauloCalendarDate(referenceDate);
  const normalizedLeadDays = Math.max(0, leadDays);

  // Check current year, and if leadDays > 0, also check year + 1 (for occasions occurring in early January)
  for (const year of [current.year, current.year + 1]) {
    const occasion = getAnnualOccasionDate(dateType, year);
    if (!occasion) continue;

    const occasionUtc = Date.UTC(year, occasion.month - 1, occasion.day);
    const windowStartUtc = occasionUtc - normalizedLeadDays * 86_400_000;
    const currentUtc = Date.UTC(current.year, current.month - 1, current.day);

    if (currentUtc >= windowStartUtc && currentUtc <= occasionUtc) {
      return { active: true, targetYear: year };
    }
  }

  return { active: false, targetYear: current.year };
}

/**
 * Checks if a recipient's birthday falls within the lead window from referenceDate.
 * Handles Feb 29 leap day policy (evaluated as Feb 28 in non-leap target years).
 */
export function isBirthdayWithinLeadWindow(
  birthDateString: string, // YYYY-MM-DD
  referenceDate: Date,
  leadDays = 0,
): { active: boolean; targetYear: number } {
  if (!isValidIsoCalendarDate(birthDateString)) {
    return { active: false, targetYear: 0 };
  }
  const parts = birthDateString.trim().split("-");
  if (parts.length !== 3) return { active: false, targetYear: 0 };
  const bMonth = Number(parts[1]);
  const bDay = Number(parts[2]);
  if (!bMonth || !bDay || bMonth < 1 || bMonth > 12 || bDay < 1 || bDay > 31) {
    return { active: false, targetYear: 0 };
  }

  const current = getSaoPauloCalendarDate(referenceDate);
  const normalizedLeadDays = Math.max(0, leadDays);

  // Check candidate target years: current year and next year (for window crossing late Dec -> early Jan)
  for (const targetYear of [current.year, current.year + 1]) {
    // Leap day policy: if birthday is Feb 29 and targetYear is not leap, treat as Feb 28
    let effectiveDay = bDay;
    if (bMonth === 2 && bDay === 29 && !isLeapYear(targetYear)) {
      effectiveDay = 28;
    }

    const birthdayUtc = Date.UTC(targetYear, bMonth - 1, effectiveDay);
    const windowStartUtc = birthdayUtc - normalizedLeadDays * 86_400_000;
    const currentUtc = Date.UTC(current.year, current.month - 1, current.day);

    if (currentUtc >= windowStartUtc && currentUtc <= birthdayUtc) {
      return { active: true, targetYear };
    }
  }

  return { active: false, targetYear: current.year };
}

/**
 * Checks if a vehicle sale anniversary falls within the lead window from referenceDate.
 * Must strictly be from a prior calendar year (saleYear < targetYear).
 */
export function isPurchaseAnniversaryWithinLeadWindow(
  saleDate: Date,
  referenceDate: Date,
  leadDays = 0,
): { active: boolean; targetYear: number } {
  const saleCalendar = getSaoPauloCalendarDate(saleDate);
  const current = getSaoPauloCalendarDate(referenceDate);
  const normalizedLeadDays = Math.max(0, leadDays);

  for (const targetYear of [current.year, current.year + 1]) {
    // Must strictly be at least 1 full year later
    if (saleCalendar.year >= targetYear) continue;

    let effectiveDay = saleCalendar.day;
    if (
      saleCalendar.month === 2 &&
      saleCalendar.day === 29 &&
      !isLeapYear(targetYear)
    ) {
      effectiveDay = 28;
    }

    const anniversaryUtc = Date.UTC(
      targetYear,
      saleCalendar.month - 1,
      effectiveDay,
    );
    const windowStartUtc = anniversaryUtc - normalizedLeadDays * 86_400_000;
    const currentUtc = Date.UTC(current.year, current.month - 1, current.day);

    if (currentUtc >= windowStartUtc && currentUtc <= anniversaryUtc) {
      return { active: true, targetYear };
    }
  }

  return { active: false, targetYear: current.year };
}
