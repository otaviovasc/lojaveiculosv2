// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  artifactPageWidth,
  humanizePdfError,
  toggleArtifactFullscreen,
  useElementWidth,
} from "./ArtifactViewerSupport";

describe("ArtifactViewerSupport", () => {
  const originalResizeObserver = globalThis.ResizeObserver;

  afterEach(() => {
    cleanup();
    globalThis.ResizeObserver = originalResizeObserver;
    vi.restoreAllMocks();
  });

  it("keeps the PDF page inside a 278px mobile stage at default zoom", () => {
    expect(artifactPageWidth(278, 1)).toBe(278);
    expect(artifactPageWidth(278, 0.7)).toBe(194);
    expect(artifactPageWidth(1200, 1)).toBe(920);
  });

  it("observes a stage that mounts after the loading state", () => {
    let resize: ResizeObserverCallback | undefined;
    globalThis.ResizeObserver = class {
      constructor(callback: ResizeObserverCallback) {
        resize = callback;
      }
      disconnect = vi.fn();
      observe = vi.fn();
      unobserve = vi.fn();
    };

    const view = render(<WidthProbe show={false} />);
    expect(screen.getByRole("status")).toHaveTextContent("0");
    view.rerender(<WidthProbe show />);

    act(() => {
      resize?.(
        [{ contentRect: { width: 278 } } as ResizeObserverEntry],
        {} as ResizeObserver,
      );
    });
    expect(screen.getByRole("status")).toHaveTextContent("278");
  });

  it("never exposes raw renderer errors to the user", () => {
    expect(humanizePdfError(new Error("Failed to fetch"))).toBe(
      "Não foi possível carregar o PDF. Verifique a conexão e tente renovar o acesso.",
    );
    expect(humanizePdfError(new Error("InvalidPDFException"))).toContain(
      "inválido ou corrompido",
    );
    expect(humanizePdfError(new Error("secret worker stack"))).not.toContain(
      "secret worker stack",
    );
  });

  it("absorbs fullscreen denial instead of leaking an unhandled rejection", async () => {
    const requestFullscreen = vi.fn().mockRejectedValue(new Error("denied"));

    await expect(
      toggleArtifactFullscreen({ requestFullscreen } as unknown as HTMLElement),
    ).resolves.toBeUndefined();
    expect(requestFullscreen).toHaveBeenCalledOnce();
  });
});

function WidthProbe({ show }: { show: boolean }) {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const width = useElementWidth(node);
  return (
    <>
      {show ? <div ref={setNode} /> : null}
      <output role="status">{width}</output>
    </>
  );
}
