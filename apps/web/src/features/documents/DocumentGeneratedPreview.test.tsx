// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DocumentGeneratedPreview } from "./DocumentGeneratedPreview";
import type { DocumentDownload, WorkspaceDocument } from "./types";

describe("DocumentGeneratedPreview", () => {
  afterEach(cleanup);

  it("renders the signed PDF URL in a document viewer", () => {
    const { container } = render(
      <DocumentGeneratedPreview document={workspaceDocument} preview={pdf} />,
    );

    const viewer = screen.getByLabelText("Prévia PDF de Contrato de venda");

    expect(viewer.getAttribute("data")).toBe(
      "https://download.local/contract.pdf#toolbar=1&navpanes=0&view=FitH",
    );
    expect(container.querySelector("dl")).toBeNull();
  });

  it("shows a loading state before the signed PDF URL is ready", () => {
    render(
      <DocumentGeneratedPreview document={workspaceDocument} preview={null} />,
    );

    expect(screen.getByText("Carregando PDF")).toBeTruthy();
  });

  it("renders a signed image URL in an image tag", () => {
    render(
      <DocumentGeneratedPreview
        document={imageDocument}
        preview={imageDownload}
      />,
    );

    const img = screen.getByAltText("Prévia de Foto do Veículo");
    expect(img.getAttribute("src")).toBe("https://download.local/photo.jpg");
  });

  it("shows a loading state before the signed image URL is ready", () => {
    render(
      <DocumentGeneratedPreview document={imageDocument} preview={null} />,
    );

    expect(screen.getByText("Carregando imagem")).toBeTruthy();
  });
});

const workspaceDocument: WorkspaceDocument = {
  context: {
    linkRole: "sale_contract",
    targetId: "sale_1",
    targetType: "sale",
  },
  createdAt: "2026-01-01T10:00:00.000Z",
  file: {
    fileName: "contract.pdf",
    fileSizeBytes: 1024,
    mimeType: "application/pdf",
  },
  id: "document_1",
  kind: "sale_contract",
  metadata: {},
  status: "issued",
  title: "Contrato de venda",
  updatedAt: "2026-01-01T10:00:00.000Z",
  uploadedAt: "2026-01-01T10:00:00.000Z",
};

const pdf: DocumentDownload = {
  document: workspaceDocument,
  downloadMethod: "GET",
  downloadUrl: "https://download.local/contract.pdf",
  expiresAt: "2026-01-01T10:05:00.000Z",
  fileName: "contract.pdf",
  mimeType: "application/pdf",
  versionId: "version_1",
  versionNumber: 1,
};

const imageDocument: WorkspaceDocument = {
  context: {
    linkRole: "other",
    targetId: "unit_1",
    targetType: "vehicle_unit",
  },
  createdAt: "2026-01-01T10:00:00.000Z",
  file: {
    fileName: "photo.jpg",
    fileSizeBytes: 2048,
    mimeType: "image/jpeg",
  },
  id: "document_2",
  kind: "other",
  metadata: {},
  status: "issued",
  title: "Foto do Veículo",
  updatedAt: "2026-01-01T10:00:00.000Z",
  uploadedAt: "2026-01-01T10:00:00.000Z",
};

const imageDownload: DocumentDownload = {
  document: imageDocument,
  downloadMethod: "GET",
  downloadUrl: "https://download.local/photo.jpg",
  expiresAt: "2026-01-01T10:05:00.000Z",
  fileName: "photo.jpg",
  mimeType: "image/jpeg",
  versionId: "version_2",
  versionNumber: 1,
};
