// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DocumentGeneratedPreview } from "./DocumentGeneratedPreview";
import type { DocumentDownload, WorkspaceDocument } from "./types";

vi.mock("../../components/ui/ArtifactViewer", () => ({
  ArtifactViewer: ({ mimeType, title, url }: Record<string, string>) => (
    <div data-mime={mimeType} data-testid="artifact-viewer">
      {title}:{url}
    </div>
  ),
}));

describe("DocumentGeneratedPreview", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "DOMMatrix", {
      configurable: true,
      value: class DOMMatrix {},
    });
  });

  afterEach(() => {
    cleanup();
    Reflect.deleteProperty(globalThis, "DOMMatrix");
  });

  it("delegates a signed PDF to the canonical artifact viewer", async () => {
    render(
      <DocumentGeneratedPreview document={workspaceDocument} preview={pdf} />,
    );

    expect(await screen.findByTestId("artifact-viewer")).toHaveTextContent(
      "Contrato de venda:https://download.local/contract.pdf",
    );
  });

  it("shows a loading state before the signed PDF URL is ready", () => {
    render(
      <DocumentGeneratedPreview document={workspaceDocument} preview={null} />,
    );

    expect(screen.getByText("Preparando arquivo")).toBeTruthy();
  });

  it("delegates a signed image to the same artifact viewer", async () => {
    render(
      <DocumentGeneratedPreview
        document={imageDocument}
        preview={imageDownload}
      />,
    );

    const viewer = await screen.findByTestId("artifact-viewer");
    expect(viewer).toHaveAttribute("data-mime", "image/jpeg");
    expect(viewer).toHaveTextContent(
      "Foto do Veículo:https://download.local/photo.jpg",
    );
  });

  it("shows a loading state before the signed image URL is ready", () => {
    render(
      <DocumentGeneratedPreview document={imageDocument} preview={null} />,
    );

    expect(screen.getByText("Preparando arquivo")).toBeTruthy();
  });
});

const workspaceDocument: WorkspaceDocument = {
  capabilities: {
    canRegenerate: false,
    regenerateBlockReason: "renderer_unavailable",
  },
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
  capabilities: {
    canRegenerate: false,
    regenerateBlockReason: "renderer_unavailable",
  },
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
