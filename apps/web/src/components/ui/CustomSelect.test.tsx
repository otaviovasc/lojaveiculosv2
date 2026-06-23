// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { CustomSelect } from "./CustomSelect";

describe("CustomSelect", () => {
  it("uses custom listbox options and updates hidden form value", async () => {
    const user = userEvent.setup();
    const { container } = render(<StatusHarness />);

    expect(container.querySelector("select")).toBeNull();
    expect(container.querySelector("option")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Rascunho" }));
    expect(container.querySelector('[role="listbox"]')).toBeNull();
    expect(screen.getByRole("listbox").parentElement).toBe(document.body);

    await user.click(screen.getByRole("option", { name: "Disponivel" }));

    expect(screen.getByRole("button", { name: "Disponivel" })).toBeVisible();
    expect(
      container.querySelector<HTMLInputElement>('input[name="status"]')?.value,
    ).toBe("available");
  });

  it("lets the menu grow beyond the trigger while using the trigger as the minimum width", async () => {
    const user = userEvent.setup();
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function getRect(this: HTMLElement) {
        if (this.classList.contains("custom-select-trigger")) {
          return createRect({ bottom: 84, left: 30, top: 40, width: 120 });
        }
        if (this.classList.contains("custom-select-menu")) {
          return createRect({ bottom: 210, left: 30, top: 90, width: 260 });
        }
        return createRect({ bottom: 0, left: 0, top: 0, width: 0 });
      });

    render(<StatusHarness />);

    await user.click(screen.getByRole("button", { name: "Rascunho" }));

    const listbox = screen.getByRole("listbox") as HTMLElement;
    expect(listbox.style.width).toBe("");
    expect(listbox).toHaveStyle({
      left: "30px",
      maxWidth: "1000px",
      minWidth: "120px",
    });

    rectSpy.mockRestore();
  });
});

function createRect({
  bottom,
  left,
  top,
  width,
}: {
  bottom: number;
  left: number;
  top: number;
  width: number;
}) {
  return {
    bottom,
    height: bottom - top,
    left,
    right: left + width,
    toJSON: () => undefined,
    top,
    width,
    x: left,
    y: top,
  };
}

function StatusHarness() {
  const [status, setStatus] = useState("draft");

  return (
    <form>
      <CustomSelect
        name="status"
        onChange={setStatus}
        options={[
          { label: "Rascunho", value: "draft" },
          { label: "Disponivel", value: "available" },
        ]}
        value={status}
      />
    </form>
  );
}
