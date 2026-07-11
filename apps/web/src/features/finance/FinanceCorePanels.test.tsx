// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FinanceRecurringPanel } from "./FinanceCorePanels";

describe("FinanceRecurringPanel", () => {
  afterEach(() => cleanup());

  it("does not submit a recurrence without the required next date", () => {
    const onCreate = vi.fn();
    const { container } = render(
      <FinanceRecurringPanel items={[]} onCreate={onCreate} />,
    );

    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    expect(onCreate).not.toHaveBeenCalled();
  });
});
