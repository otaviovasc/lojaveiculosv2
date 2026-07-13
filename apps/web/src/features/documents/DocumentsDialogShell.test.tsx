// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DocumentsDialogShell } from "./DocumentsDialogShell";

afterEach(cleanup);

describe("DocumentsDialogShell", () => {
  it("uses the shared accessible dialog while preserving documents classes", () => {
    const onClose = vi.fn();
    render(
      <DocumentsDialogShell
        className="documents-links-dialog"
        onClose={onClose}
        title="Gerenciar vínculos"
      >
        <button type="button">Salvar</button>
      </DocumentsDialogShell>,
    );

    const dialog = screen.getByRole("dialog", { name: "Gerenciar vínculos" });
    expect(dialog).toHaveClass("documents-links-dialog");
    expect(dialog.parentElement).toHaveClass("documents-modal-backdrop");

    fireEvent.click(dialog.parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps busy dialogs open on backdrop and Escape dismissal attempts", () => {
    const onClose = vi.fn();
    render(
      <DocumentsDialogShell
        canDismiss={false}
        className="documents-upload-dialog"
        onClose={onClose}
        title="Anexar documentos"
      >
        <span>Enviando</span>
      </DocumentsDialogShell>,
    );

    const dialog = screen.getByRole("dialog", { name: "Anexar documentos" });
    fireEvent.click(dialog.parentElement as HTMLElement);
    fireEvent.keyDown(window, { key: "Escape" });

    expect(onClose).not.toHaveBeenCalled();
  });
});
