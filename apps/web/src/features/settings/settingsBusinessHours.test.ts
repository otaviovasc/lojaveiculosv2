import { describe, expect, it } from "vitest";
import {
  businessHoursToText,
  textToBusinessHours,
} from "./settingsBusinessHours";

describe("settings business hours helpers", () => {
  it("keeps the V1 free-text business hours shape editable in V2 JSON", () => {
    const text = "Segunda a Sexta, 9h as 18h\nSabado, 9h as 14h";

    expect(textToBusinessHours(text)).toEqual({ text });
    expect(businessHoursToText({ text })).toBe(text);
  });

  it("renders keyed business hours as readable lines", () => {
    expect(
      businessHoursToText({
        monday: { close: "18:00", open: "09:00" },
        saturday: "9h as 14h",
      }),
    ).toBe("Segunda: 09:00 - 18:00\nSabado: 9h as 14h");
  });
});
