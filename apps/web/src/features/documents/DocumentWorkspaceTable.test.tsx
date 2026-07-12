// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DocumentsTable } from "./DocumentWorkspaceTable";
import type { WorkspaceDocument } from "./types";

afterEach(cleanup);

describe("DocumentsTable responsive contract", () => {
  it("protects desktop status and action columns from clipping", () => {
    renderTable();

    const table = screen.getByRole("table");
    expect(table.parentElement).toHaveClass("hidden", "md:block");
    expect(
      within(table).getByRole("columnheader", { name: "Status" }),
    ).toHaveClass("w-36", "min-w-36");
    expect(
      within(table).getByRole("columnheader", { name: "Ações" }),
    ).toHaveClass("w-40", "min-w-40");
    expect(within(table).getByText("Emitido")).toHaveClass(
      "min-w-max",
      "whitespace-nowrap",
    );
  });

  it("exposes a legible mobile card with metadata and complete actions", () => {
    const onDelete = vi.fn();
    const onDownload = vi.fn(async () => undefined);
    const onSelect = vi.fn();
    renderTable({ onDelete, onDownload, onSelect });

    const mobileList = screen.getByTestId("documents-mobile-list");
    expect(mobileList).toHaveClass("md:hidden");
    expect(within(mobileList).getByText("Contrato de venda")).toBeVisible();
    expect(within(mobileList).getByText("Emitido")).toBeVisible();
    expect(within(mobileList).getByText("Honda Civic Touring")).toBeVisible();

    fireEvent.click(
      within(mobileList).getByRole("button", {
        name: /Contrato de venda/i,
      }),
    );
    fireEvent.click(
      within(mobileList).getByRole("button", { name: "Baixar documento" }),
    );
    fireEvent.click(
      within(mobileList).getByRole("button", { name: "Excluir documento" }),
    );

    expect(onSelect).toHaveBeenCalledWith(documentFixture);
    expect(onDownload).toHaveBeenCalledWith(documentFixture.id);
    expect(onDelete).toHaveBeenCalledWith(documentFixture);
  });
});

function renderTable(
  overrides: Partial<{
    onDelete: (document: WorkspaceDocument) => void;
    onDownload: (documentId: string) => Promise<void>;
    onSelect: (document: WorkspaceDocument) => void;
  }> = {},
) {
  render(
    <DocumentsTable
      documents={[documentFixture]}
      isBusy={false}
      onDelete={overrides.onDelete ?? vi.fn()}
      onDownload={overrides.onDownload ?? vi.fn(async () => undefined)}
      onSelect={overrides.onSelect ?? vi.fn()}
    />,
  );
}

const documentFixture: WorkspaceDocument = {
  capabilities: {
    canRegenerate: false,
    regenerateBlockReason: "renderer_unavailable",
  },
  context: {
    linkRole: "sale_contract",
    targetId: "unit_1",
    targetType: "vehicle_unit",
  },
  createdAt: "2026-07-11T10:00:00.000Z",
  file: {
    fileName: "contrato-venda.pdf",
    fileSizeBytes: 2048,
    mimeType: "application/pdf",
  },
  id: "document_1",
  kind: "sale_contract",
  metadata: {
    vehicle: {
      plate: "ABC1D23",
      title: "Honda Civic Touring",
      unitId: "unit_1",
    },
  },
  status: "issued",
  title: "Contrato de venda",
  updatedAt: "2026-07-11T10:00:00.000Z",
  uploadedAt: "2026-07-11T10:00:00.000Z",
};
