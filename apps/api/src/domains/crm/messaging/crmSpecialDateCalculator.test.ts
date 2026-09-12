import { describe, expect, it, vi } from "vitest";
import {
  calculateEaster,
  calculateNthWeekdayOfMonth,
  calculateSendInstantUtc,
  getAnnualOccasionDate,
  getSaoPauloCalendarDate,
  isValidIsoCalendarBirthDate,
  isBirthdayWithinLeadWindow,
  isLeapYear,
  isOccasionWithinLeadWindow,
  isPurchaseAnniversaryWithinLeadWindow,
} from "./crmSpecialDateCalculator.js";

describe("crmSpecialDateCalculator", () => {
  describe("Sao Paulo calendar parsing and timezone rollover", () => {
    it("preserves correct BRT calendar day even after 21:00 BRT (which is next UTC day)", () => {
      // 2026-05-10 22:30:00 BRT is 2026-05-11 01:30:00 UTC
      const dateUtc = new Date(Date.UTC(2026, 4, 11, 1, 30, 0));
      const calendar = getSaoPauloCalendarDate(dateUtc);
      expect(calendar).toEqual({
        day: 10,
        month: 5,
        year: 2026,
      });
    });

    it("parses daytime BRT correctly", () => {
      const dateUtc = new Date(Date.UTC(2026, 11, 25, 14, 0, 0)); // 11:00 BRT
      const calendar = getSaoPauloCalendarDate(dateUtc);
      expect(calendar).toEqual({
        day: 25,
        month: 12,
        year: 2026,
      });
    });
  });

  describe("Easter calculation (Butcher's algorithm)", () => {
    it("calculates Easter accurately across multiple known years", () => {
      expect(calculateEaster(2024)).toEqual({ day: 31, month: 3 });
      expect(calculateEaster(2025)).toEqual({ day: 20, month: 4 });
      expect(calculateEaster(2026)).toEqual({ day: 5, month: 4 });
      expect(calculateEaster(2027)).toEqual({ day: 28, month: 3 });
      expect(calculateEaster(2028)).toEqual({ day: 16, month: 4 });
    });
  });

  describe("Movable annual occasions", () => {
    it("calculates Mother's Day (2nd Sunday of May)", () => {
      // 2026: May 1 is Friday -> 1st Sun is May 3, 2nd Sun is May 10
      expect(getAnnualOccasionDate("mothersDay", 2026)).toEqual({
        day: 10,
        month: 5,
      });
      // 2025: May 1 is Thursday -> 1st Sun is May 4, 2nd Sun is May 11
      expect(getAnnualOccasionDate("mothersDay", 2025)).toEqual({
        day: 11,
        month: 5,
      });
    });

    it("calculates Father's Day (2nd Sunday of August in Brazil)", () => {
      // 2026: Aug 1 is Saturday -> 1st Sun is Aug 2, 2nd Sun is Aug 9
      expect(getAnnualOccasionDate("fathersDay", 2026)).toEqual({
        day: 9,
        month: 8,
      });
      // 2025: Aug 1 is Friday -> 1st Sun is Aug 3, 2nd Sun is Aug 10
      expect(getAnnualOccasionDate("fathersDay", 2025)).toEqual({
        day: 10,
        month: 8,
      });
    });

    it("calculates Black Friday as the Friday after Thanksgiving (4th Thursday + 1 day)", () => {
      // 2024: Nov 1 is Friday -> 4th Thursday is Nov 28 -> Black Friday is Nov 29 (5th Friday!)
      expect(getAnnualOccasionDate("blackFriday", 2024)).toEqual({
        day: 29,
        month: 11,
      });
      // 2025: Nov 1 is Saturday -> 4th Thursday is Nov 27 -> Black Friday is Nov 28
      expect(getAnnualOccasionDate("blackFriday", 2025)).toEqual({
        day: 28,
        month: 11,
      });
      // 2026: Nov 1 is Sunday -> 4th Thursday is Nov 26 -> Black Friday is Nov 27
      expect(getAnnualOccasionDate("blackFriday", 2026)).toEqual({
        day: 27,
        month: 11,
      });
      // 2029: Nov 1 is Thursday -> 4th Thursday is Nov 22 -> Black Friday is Nov 23 (4th Friday)
      expect(getAnnualOccasionDate("blackFriday", 2029)).toEqual({
        day: 23,
        month: 11,
      });
      // 2030: Nov 1 is Friday -> 4th Thursday is Nov 28 -> Black Friday is Nov 29 (5th Friday!)
      expect(getAnnualOccasionDate("blackFriday", 2030)).toEqual({
        day: 29,
        month: 11,
      });
    });

    it("calculates Christmas (Dec 25)", () => {
      expect(getAnnualOccasionDate("christmas", 2026)).toEqual({
        day: 25,
        month: 12,
      });
    });
  });

  describe("Lead window and holiday activation", () => {
    it("activates on exact holiday date with leadDays=0", () => {
      const christmas = new Date(Date.UTC(2026, 11, 25, 12, 0, 0));
      const res = isOccasionWithinLeadWindow("christmas", christmas, 0);
      expect(res.active).toBe(true);
      expect(res.targetYear).toBe(2026);
    });

    it("activates within leadDays window before holiday", () => {
      // Christmas Dec 25 with leadDays=3: active Dec 22-25
      const dec22 = new Date(Date.UTC(2026, 11, 22, 12, 0, 0));
      expect(isOccasionWithinLeadWindow("christmas", dec22, 3).active).toBe(
        true,
      );

      const dec21 = new Date(Date.UTC(2026, 11, 21, 12, 0, 0));
      expect(isOccasionWithinLeadWindow("christmas", dec21, 3).active).toBe(
        false,
      );

      const dec26 = new Date(Date.UTC(2026, 11, 26, 12, 0, 0));
      expect(isOccasionWithinLeadWindow("christmas", dec26, 3).active).toBe(
        false,
      );
    });
  });

  describe("Birthday calculation and leap year policy", () => {
    it("uses the Sao Paulo calendar when UTC has already crossed midnight", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-09-08T02:00:00.000Z")); // Sep 7, 23:00 BRT
      try {
        expect(isValidIsoCalendarBirthDate("2026-09-07")).toBe(true);
        expect(isValidIsoCalendarBirthDate("2026-09-08")).toBe(false);
      } finally {
        vi.useRealTimers();
      }
    });

    it("matches normal birthday on exact day", () => {
      const today = new Date(Date.UTC(2026, 6, 15, 12, 0, 0)); // July 15, 2026
      expect(isBirthdayWithinLeadWindow("1990-07-15", today, 0).active).toBe(
        true,
      );
      expect(isBirthdayWithinLeadWindow("1990-07-16", today, 0).active).toBe(
        false,
      );
    });

    it("matches birthday within leadDays window", () => {
      const today = new Date(Date.UTC(2026, 6, 12, 12, 0, 0)); // July 12
      // Birthday is July 15, leadDays is 3 -> active on July 12
      expect(isBirthdayWithinLeadWindow("1990-07-15", today, 3).active).toBe(
        true,
      );
      // LeadDays 2 -> not active yet on July 12
      expect(isBirthdayWithinLeadWindow("1990-07-15", today, 2).active).toBe(
        false,
      );
    });

    it("handles Feb 29 leap day policy in non-leap year (treated as Feb 28)", () => {
      expect(isLeapYear(2024)).toBe(true);
      expect(isLeapYear(2026)).toBe(false);

      // In 2026 (non-leap year), Feb 28 matches a Feb 29 birth date
      const feb28_2026 = new Date(Date.UTC(2026, 1, 28, 12, 0, 0));
      expect(
        isBirthdayWithinLeadWindow("1996-02-29", feb28_2026, 0).active,
      ).toBe(true);

      // In 2024 (leap year), Feb 29 matches
      const feb29_2024 = new Date(Date.UTC(2024, 1, 29, 12, 0, 0));
      expect(
        isBirthdayWithinLeadWindow("1996-02-29", feb29_2024, 0).active,
      ).toBe(true);
    });

    it("handles window crossing month boundaries (e.g. March 2 with leadDays 3)", () => {
      const feb28 = new Date(Date.UTC(2026, 1, 28, 12, 0, 0));
      // Birthday is March 2
      expect(isBirthdayWithinLeadWindow("1995-03-02", feb28, 3).active).toBe(
        true,
      );
      expect(isBirthdayWithinLeadWindow("1995-03-02", feb28, 1).active).toBe(
        false,
      );
    });
  });

  describe("Purchase anniversary", () => {
    it("matches purchase anniversary from prior year", () => {
      const saleDate = new Date(Date.UTC(2024, 9, 20, 15, 0, 0)); // Oct 20, 2024
      const today = new Date(Date.UTC(2026, 9, 20, 12, 0, 0)); // Oct 20, 2026
      const res = isPurchaseAnniversaryWithinLeadWindow(saleDate, today, 0);
      expect(res.active).toBe(true);
      expect(res.targetYear).toBe(2026);
    });

    it("does not match sale from same year", () => {
      const saleDate = new Date(Date.UTC(2026, 3, 10, 15, 0, 0));
      const today = new Date(Date.UTC(2026, 3, 10, 12, 0, 0));
      expect(
        isPurchaseAnniversaryWithinLeadWindow(saleDate, today, 0).active,
      ).toBe(false);
    });

    it("handles a New Year window against the following target year", () => {
      const december30 = new Date(Date.UTC(2026, 11, 30, 12, 0, 0));
      const result = isBirthdayWithinLeadWindow("1995-01-01", december30, 3);
      expect(result).toEqual({ active: true, targetYear: 2027 });
    });
  });

  describe("Deterministic send instant UTC", () => {
    it("converts 09:00 BRT to 12:00:00.000 UTC", () => {
      const refDate = new Date(Date.UTC(2026, 5, 10, 12, 0, 0));
      const instant = calculateSendInstantUtc(refDate, "09:00");
      expect(instant.toISOString()).toBe("2026-06-10T12:00:00.000Z");
    });

    it("converts custom send time 14:30 BRT to 17:30:00.000 UTC", () => {
      const refDate = new Date(Date.UTC(2026, 5, 10, 12, 0, 0));
      const instant = calculateSendInstantUtc(refDate, "14:30");
      expect(instant.toISOString()).toBe("2026-06-10T17:30:00.000Z");
    });

    it("converts midnight 00:00 BRT to 03:00:00.000 UTC without falling back to 09:00", () => {
      const refDate = new Date(Date.UTC(2026, 5, 10, 12, 0, 0));
      const instant = calculateSendInstantUtc(refDate, "00:00");
      expect(instant.toISOString()).toBe("2026-06-10T03:00:00.000Z");
    });
  });
});
