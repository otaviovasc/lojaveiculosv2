// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmMediaPreviewDialog } from "./CrmMediaPreviewDialog";

afterEach(cleanup);

describe("CrmMediaPreviewDialog", () => {
  it("uses the shared named modal layer and closes on Escape", async () => {
    const file = new File(["imagem"], "estoque.jpg", { type: "image/jpeg" });
    const onClose = vi.fn();
    render(
      <CrmMediaPreviewDialog
        activeIndex={0}
        caption=""
        files={[file]}
        onCaptionChange={vi.fn()}
        onClose={onClose}
        onPickAudio={vi.fn()}
        onPickDocuments={vi.fn()}
        onPickImages={vi.fn()}
        onRemove={vi.fn()}
        onSelect={vi.fn()}
        onSend={vi.fn()}
        previewUrls={new Map([[file, "blob:estoque"]])}
      />,
    );

    expect(
      await screen.findByRole("dialog", { name: "estoque.jpg" }),
    ).toHaveClass("crm-media-dialog-panel");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
