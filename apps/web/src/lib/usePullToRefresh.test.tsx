// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePullToRefresh } from "./usePullToRefresh";

describe("usePullToRefresh", () => {
  afterEach(cleanup);

  it("tracks a touch pull, prevents the overscroll, and refreshes at threshold", async () => {
    const refresh = vi.fn(async () => undefined);
    render(<PullSurface onRefresh={refresh} pullThreshold={20} maxPull={40} />);
    const surface = screen.getByTestId("pull-surface");

    fireEvent.touchEnd(surface);
    fireEvent.touchStart(surface, { touches: [] });
    fireEvent.touchMove(surface, { touches: [] });
    Object.defineProperty(surface, "scrollTop", {
      configurable: true,
      value: 10,
      writable: true,
    });
    fireEvent.touchStart(surface, { touches: [{ clientY: 5 }] });
    Object.defineProperty(surface, "scrollTop", {
      configurable: true,
      value: 0,
      writable: true,
    });
    fireEvent.touchStart(surface, { touches: [{ clientY: 10 }] });
    fireEvent.touchMove(surface, { touches: [] });
    fireEvent.touchMove(surface, {
      cancelable: true,
      touches: [{ clientY: 12 }],
    });
    expect(surface).toHaveAttribute("data-ready", "false");
    fireEvent.touchMove(surface, {
      cancelable: true,
      touches: [{ clientY: 80 }],
    });
    expect(surface).toHaveAttribute("data-pull", "40");
    expect(surface).toHaveAttribute("data-ready", "true");
    fireEvent.touchEnd(surface);
    await act(async () => undefined);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(surface).toHaveAttribute("data-pull", "0");
    expect(surface).toHaveAttribute("data-refreshing", "false");
  });

  it("resets a short or upward touch without refreshing", () => {
    const refresh = vi.fn();
    render(<PullSurface onRefresh={refresh} />);
    const surface = screen.getByTestId("pull-surface");

    fireEvent.touchStart(surface, { touches: [{ clientY: 30 }] });
    fireEvent.touchMove(surface, {
      cancelable: false,
      touches: [{ clientY: 20 }],
    });
    fireEvent.touchEnd(surface);
    expect(refresh).not.toHaveBeenCalled();
    expect(surface).toHaveAttribute("data-pull", "0");
  });

  it("handles mouse pull and regular scroll drags", async () => {
    const refresh = vi.fn(async () => undefined);
    render(<PullSurface onRefresh={refresh} pullThreshold={20} maxPull={40} />);
    const surface = screen.getByTestId("pull-surface");

    fireEvent.mouseMove(window, { clientY: 20 });
    fireEvent.mouseDown(surface, { button: 2, clientY: 20 });
    fireEvent.mouseDown(surface, { button: 0, clientY: 20 });
    fireEvent.click(surface);
    fireEvent.mouseMove(window, { clientY: 22 });
    expect(surface).toHaveAttribute("data-pull", "1.3");
    fireEvent.mouseMove(window, { clientY: 100 });
    expect(surface).toHaveAttribute("data-pull", "40");
    fireEvent.mouseUp(window);
    await act(async () => undefined);
    expect(refresh).toHaveBeenCalledTimes(1);

    Object.defineProperty(surface, "scrollTop", {
      configurable: true,
      value: 50,
      writable: true,
    });
    fireEvent.mouseDown(surface, { button: 0, clientY: 100 });
    fireEvent.mouseMove(window, { clientY: 120 });
    expect(surface.scrollTop).toBe(24);
    fireEvent.click(surface);
    fireEvent.mouseUp(window);
    expect(surface).toHaveAttribute("data-pull", "0");
  });

  it("does not intercept disabled surfaces or protected controls", () => {
    const refresh = vi.fn();
    const { rerender } = render(
      <PullSurface disabled onRefresh={refresh} withButton />,
    );
    const surface = screen.getByTestId("pull-surface");
    const button = screen.getByRole("button", { name: "Ação" });
    fireEvent.mouseDown(surface, { button: 0, clientY: 10 });
    fireEvent.mouseMove(window, { clientY: 100 });
    fireEvent.mouseUp(window);
    expect(refresh).not.toHaveBeenCalled();

    rerender(<PullSurface onRefresh={refresh} withButton />);
    fireEvent.mouseDown(button, { button: 0, clientY: 10 });
    fireEvent.mouseMove(window, { clientY: 100 });
    fireEvent.mouseUp(window);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("leaves the hook inert before a ref is attached", () => {
    const { result } = renderHook(() =>
      usePullToRefresh<HTMLDivElement>({ onRefresh: vi.fn() }),
    );
    expect(result.current.pullDistance).toBe(0);
    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.isTriggerReady).toBe(false);
  });
});

function PullSurface({
  disabled = false,
  onRefresh,
  pullThreshold,
  maxPull,
  withButton = false,
}: {
  disabled?: boolean;
  onRefresh: () => Promise<unknown> | void;
  pullThreshold?: number;
  maxPull?: number;
  withButton?: boolean;
}) {
  const state = usePullToRefresh<HTMLDivElement>({
    disabled,
    ...(maxPull === undefined ? {} : { maxPull }),
    onRefresh,
    ...(pullThreshold === undefined ? {} : { pullThreshold }),
  });
  return (
    <div
      data-pull={state.pullDistance}
      data-ready={String(state.isTriggerReady)}
      data-refreshing={String(state.isRefreshing)}
      data-testid="pull-surface"
      ref={state.containerRef}
    >
      {withButton ? (
        <button data-prevent-drag type="button">
          Ação
        </button>
      ) : null}
    </div>
  );
}
