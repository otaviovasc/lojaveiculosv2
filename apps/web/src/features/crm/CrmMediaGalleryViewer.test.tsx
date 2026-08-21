// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmMediaGalleryViewer } from "./CrmMediaGalleryViewer";

describe("CrmMediaGalleryViewer", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders when open with image, sender info, and counter", () => {
    render(
      <CrmMediaGalleryViewer
        isOpen={true}
        mediaList={[
          {
            caption: "Foto frontal",
            sender: "Cliente João",
            time: "14:30",
            type: "IMAGE",
            url: "https://cdn.local/car-1.jpg",
          },
          {
            sender: "Cliente João",
            time: "14:31",
            type: "IMAGE",
            url: "https://cdn.local/car-2.jpg",
          },
        ]}
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("dialog", { name: "Visualizador de midia" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Cliente João")).toBeInTheDocument();
    expect(screen.getByText("14:30")).toBeInTheDocument();
    expect(screen.getByText("Foto frontal")).toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    expect(screen.getByAltText("Foto frontal")).toHaveAttribute(
      "src",
      "https://cdn.local/car-1.jpg",
    );
  });

  it("navigates to next and previous items via buttons and keyboard", async () => {
    const user = userEvent.setup();
    render(
      <CrmMediaGalleryViewer
        isOpen={true}
        mediaList={[
          { type: "IMAGE", url: "https://cdn.local/car-1.jpg" },
          { type: "IMAGE", url: "https://cdn.local/car-2.jpg" },
        ]}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("1 / 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Proxima midia" }));
    expect(screen.getByText("2 / 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Midia anterior" }));
    expect(screen.getByText("1 / 2")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText("2 / 2")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });

  it("calls onClose when clicking close button or pressing Escape", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <CrmMediaGalleryViewer
        isOpen={true}
        mediaList={[{ type: "IMAGE", url: "https://cdn.local/car-1.jpg" }]}
        onClose={onClose}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Fechar visualizador" }),
    );
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
