// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { listingDetailPayload } from "../api/apiClientTestSupport";
import type { InventoryDocument, InventoryListingDetail } from "../model/types";
import { DocumentosContratosCard } from "./DocumentosContratosCard";

afterEach(cleanup);

describe("DocumentosContratosCard", () => {
  it("lists only persisted artifacts and hands official work to Documents", () => {
    render(
      <DocumentosContratosCard
        detail={createDetail([
          createDocument("sale_contract", "signed", "Contrato assinado"),
          createDocument("invoice", "issued", "Nota fiscal"),
        ])}
      />,
    );

    expect(screen.getByText("Contrato assinado")).toBeVisible();
    expect(screen.getByText("Assinado")).toBeVisible();
    expect(screen.queryByText("Nota fiscal")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Abrir Central de documentos" }),
    ).toHaveAttribute("href", "#/documents");
    expect(
      screen.getByText(/prévia e o download usam o mesmo arquivo armazenado/i),
    ).toBeVisible();
  });

  it("does not offer a local draft, print, or PDF-save action", () => {
    render(<DocumentosContratosCard detail={createDetail([])} />);

    expect(
      screen.getByText(
        "Nenhum contrato ou recibo oficial vinculado a este veículo.",
      ),
    ).toBeVisible();
    expect(
      screen.getByText(/Este cadastro não cria minutas locais/i),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /gerar|imprimir|salvar pdf/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

function createDetail(
  documents: readonly InventoryDocument[],
): InventoryListingDetail {
  return {
    ...listingDetailPayload(),
    documents,
  } as unknown as InventoryListingDetail;
}

function createDocument(
  kind: InventoryDocument["kind"],
  status: InventoryDocument["status"],
  title: string,
): InventoryDocument {
  return {
    createdAt: "2026-01-01T12:00:00.000Z",
    fileName: `${kind}.pdf`,
    fileSizeBytes: 8_192,
    id: `doc-${kind}`,
    kind,
    linkRole: "primary",
    metadata: {},
    mimeType: "application/pdf",
    status,
    storageKey: `documents/${kind}.pdf`,
    storeId: "store_1",
    targetId: "unit_1",
    targetType: "vehicle_unit",
    tenantId: "tenant_1",
    title,
    updatedAt: "2026-01-01T12:00:00.000Z",
    uploadedAt: "2026-01-01T12:00:00.000Z",
  };
}
