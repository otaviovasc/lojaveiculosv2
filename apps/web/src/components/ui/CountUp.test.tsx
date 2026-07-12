// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CountUp, { AnimatedCounter } from "./CountUp";

const motionState = vi.hoisted(() => ({ reduced: false }));

vi.mock("motion/react", () => ({
  motion: {
    span: ({
      children,
      className,
    }: {
      children: React.ReactNode;
      className?: string;
    }) => <span className={className}>{children}</span>,
  },
  useReducedMotion: () => motionState.reduced,
}));

describe("CountUp", () => {
  afterEach(() => {
    cleanup();
    motionState.reduced = false;
  });

  it("exposes the final formatted business value on the first render", () => {
    render(<AnimatedCounter value="R$ 126.900,00" />);
    expect(screen.getByText("R$ 126.900,00")).toBeVisible();
    expect(screen.queryByText("R$ 0,00")).not.toBeInTheDocument();
  });

  it("keeps the final value visible when motion is reduced", () => {
    motionState.reduced = true;
    render(<CountUp from={0} separator="." to={126900} />);
    expect(screen.getByText("126.900")).toBeVisible();
  });

  it("does not substitute the initial value while waiting to start", () => {
    render(<CountUp from={1} startWhen={false} to={42} />);
    expect(screen.getByText("42")).toBeVisible();
    expect(screen.queryByText("1")).not.toBeInTheDocument();
  });
});
