// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WebsiteBuilderPreviewFrame } from "./WebsiteBuilderPreviewFrame";
import type { WebsiteBuilderConfig } from "./WebsiteBuilderTypes";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("WebsiteBuilderPreviewFrame readiness", () => {
  it("shows a retryable timeout instead of claiming the preview is live", async () => {
    vi.useFakeTimers();
    render(
      <WebsiteBuilderPreviewFrame
        config={config}
        onViewportChange={vi.fn()}
        slug="demo"
        templateId="quadra"
        viewportMode="desktop"
      />,
    );

    expect(screen.getByText("Carregando pré-visualização")).toBeVisible();
    expect(
      screen.queryByText("Pré-visualização ao vivo"),
    ).not.toBeInTheDocument();

    await act(() => vi.advanceTimersByTime(8_000));

    expect(screen.getByText("Pré-visualização indisponível")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Tentar novamente" }),
    ).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(screen.getByTitle("Pré-visualização")).toHaveAttribute(
      "src",
      expect.stringContaining("previewAttempt=1"),
    );
    expect(screen.getByText("Carregando pré-visualização")).toBeVisible();
  });

  it("marks the preview live only after the iframe load event", async () => {
    vi.useFakeTimers();
    render(
      <WebsiteBuilderPreviewFrame
        config={config}
        onViewportChange={vi.fn()}
        slug="demo"
        templateId="quadra"
        viewportMode="desktop"
      />,
    );

    fireEvent.load(screen.getByTitle("Pré-visualização"));
    await act(() => vi.advanceTimersByTime(200));

    expect(screen.getByText("Pré-visualização ao vivo")).toBeVisible();
    await act(() => vi.advanceTimersByTime(8_000));
    expect(
      screen.queryByText("Pré-visualização indisponível"),
    ).not.toBeInTheDocument();
  });
});

const config = {
  fonts: { body: "Inter", heading: "Bricolage Grotesque" },
} as WebsiteBuilderConfig;
