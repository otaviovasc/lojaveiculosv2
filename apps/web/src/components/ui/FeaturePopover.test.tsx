// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { useRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeatureAnchoredPopover } from "./FeaturePopover";

afterEach(() => {
  cleanup();
});

describe("FeatureAnchoredPopover", () => {
  it("portals and keeps a wide menu inside a narrow viewport", () => {
    setViewport({ height: 844, width: 390 });
    const rectSpy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function getRect(this: HTMLElement) {
        if (this.dataset.testid === "anchor") {
          return createRect({ bottom: 691, left: 258, top: 655, width: 97 });
        }
        if (this.getAttribute("role") === "menu") {
          return createRect({ bottom: 270, left: 0, top: 0, width: 224 });
        }
        return createRect({ bottom: 0, left: 0, top: 0, width: 0 });
      });

    const { container } = render(<PopoverHarness />);

    const menu = screen.getByRole("menu");
    expect(container.querySelector('[role="menu"]')).toBeNull();
    expect(menu.parentElement).toBe(document.body);
    expect(menu).toHaveStyle({
      left: "154px",
      maxHeight: "320px",
      maxWidth: "366px",
      minWidth: "97px",
      top: "377px",
    });

    rectSpy.mockRestore();
  });

  it("closes on outside pointer down", async () => {
    render(<PopoverHarness />);

    expect(screen.getByRole("menu")).toBeVisible();
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));

    await waitFor(() =>
      expect(screen.queryByRole("menu")).not.toBeInTheDocument(),
    );
  });
});

function PopoverHarness() {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(true);

  return (
    <div>
      <button data-testid="anchor" ref={anchorRef} type="button">
        Colunas
      </button>
      <FeatureAnchoredPopover
        anchorRef={anchorRef}
        isOpen={open}
        onClose={() => setOpen(false)}
      >
        <label>
          <input type="checkbox" />
          Dias em Estoque
        </label>
      </FeatureAnchoredPopover>
    </div>
  );
}

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

function setViewport({ height, width }: { height: number; width: number }) {
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: height,
  });
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });
}
