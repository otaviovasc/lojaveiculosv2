// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDragToScroll } from "./useDragToScroll";

describe("useDragToScroll", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("does nothing until a primary drag starts outside editable controls", () => {
    const onClick = vi.fn();
    const { container } = render(
      <div onClick={onClick}>
        <DragSurface />
      </div>,
    );
    const surface = container.querySelector<HTMLDivElement>("[data-drag]")!;
    const input = surface.querySelector("input")!;

    dispatchMouse(window, "mousemove", { pageX: 30 });
    dispatchMouse(surface, "mousedown", { button: 2, pageX: 30 });
    dispatchMouse(window, "mousemove", { pageX: 70 });
    expect(surface.scrollLeft).toBe(0);

    dispatchMouse(input, "mousedown", { button: 0, pageX: 30 });
    dispatchMouse(window, "mousemove", { pageX: 70 });
    expect(surface.scrollLeft).toBe(0);

    dispatchMouse(surface, "mousedown", { button: 0, pageX: 100 });
    dispatchMouse(window, "mousemove", { pageX: 102 });
    expect(surface.style.cursor).toBe("");
    dispatchMouse(window, "mousemove", { pageX: 120 });
    expect(surface.style.cursor).toBe("grabbing");
    expect(surface.scrollLeft).toBeLessThan(0);

    fireEvent.click(surface);
    expect(onClick).not.toHaveBeenCalled();
    dispatchMouse(window, "mouseup", {});
    expect(surface.style.cursor).toBe("");
    expect(surface.style.userSelect).toBe("");
    dispatchMouse(window, "mouseup", {});
  });

  it("cleans up listeners when the surface unmounts", () => {
    const { unmount } = render(<DragSurface />);
    unmount();
    dispatchMouse(window, "mousemove", { pageX: 80 });
    dispatchMouse(window, "mouseup", {});
    expect(document.querySelector("[data-drag]")).toBeNull();
  });

  it("returns an empty ref when no element has mounted", () => {
    expect(
      renderHook(() => useDragToScroll()).result.current.current,
    ).toBeNull();
  });
});

function DragSurface() {
  const ref = useDragToScroll<HTMLDivElement>();
  return (
    <div data-drag ref={ref}>
      <input aria-label="Filtro" />
    </div>
  );
}

function dispatchMouse(
  target: Window | HTMLElement,
  type: "mousedown" | "mousemove" | "mouseup",
  values: { button?: number; pageX?: number },
) {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, "button", { value: values.button ?? 0 });
  Object.defineProperty(event, "pageX", { value: values.pageX ?? 0 });
  fireEvent(target, event);
}
