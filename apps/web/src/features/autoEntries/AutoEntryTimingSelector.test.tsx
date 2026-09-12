// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AutoEntryTimingSelector,
  normalizeTimingValue,
} from "./AutoEntryTimingSelector";

afterEach(cleanup);

describe("normalizeTimingValue", () => {
  it("keeps digits only and drops leading zeros", () => {
    expect(normalizeTimingValue("", 31)).toBe("");
    expect(normalizeTimingValue("abc", 31)).toBe("");
    expect(normalizeTimingValue("05", 31)).toBe("5");
    expect(normalizeTimingValue("12", 31)).toBe("12");
  });

  it("clamps values above the timing limit", () => {
    expect(normalizeTimingValue("45", 31)).toBe("31");
    expect(normalizeTimingValue("400", 365)).toBe("365");
    expect(normalizeTimingValue("365", 365)).toBe("365");
  });

  it("keeps a bare zero so form validation can reject it", () => {
    expect(normalizeTimingValue("0", 31)).toBe("0");
  });
});

describe("AutoEntryTimingSelector", () => {
  it("shows a hint instead of an input for same-day posting", () => {
    render(<TimingHarness kind="same_day" />);

    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    expect(
      screen.getByText("Criado na data segura informada pelo evento."),
    ).toBeVisible();
  });

  it("accepts a clamped day of month between 1 and 31", async () => {
    const user = userEvent.setup();
    render(<TimingHarness kind="day_of_month" />);

    const input = screen.getByLabelText("Dia do mês");
    await user.type(input, "45");

    expect(input).toHaveValue(31);
    expect(screen.getByText("1–31")).toBeVisible();
  });

  it("labels the next-month day input explicitly", async () => {
    const user = userEvent.setup();
    render(<TimingHarness kind="next_month_day" />);

    const input = screen.getByLabelText("Dia do próximo mês");
    await user.type(input, "7");

    expect(input).toHaveValue(7);
    expect(screen.getByText("1–31")).toBeVisible();
  });
});

function TimingHarness({
  kind,
}: {
  kind: Parameters<typeof AutoEntryTimingSelector>[0]["kind"];
}) {
  const [value, setValue] = useState("");
  return (
    <AutoEntryTimingSelector
      kind={kind}
      onKindChange={vi.fn()}
      onValueChange={setValue}
      value={value}
    />
  );
}
