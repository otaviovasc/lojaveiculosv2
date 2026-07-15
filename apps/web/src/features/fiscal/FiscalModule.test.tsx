// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FiscalApi } from "./apiClient";
import { FiscalModule } from "./FiscalModule";

vi.mock("../../components/ui/AnimatedContent", () => ({
  default: ({ children }: { children: unknown }) => children,
}));

vi.stubGlobal(
  "IntersectionObserver",
  class {
    disconnect() {}
    observe() {}
    unobserve() {}
  },
);

describe("FiscalModule", () => {
  afterEach(cleanup);

  it("uses semantic labels and blocks emission while configuration is missing", async () => {
    const api = createApi();
    render(<FiscalModule api={api} />);

    expect(
      await screen.findByRole("heading", { name: "Operação fiscal", level: 1 }),
    ).toBeVisible();
    expect(
      await screen.findByText("Integração fiscal incompleta"),
    ).toBeVisible();
    expect(screen.getByText("Credencial de acesso à Spedy")).toBeVisible();
    expect(screen.getByText("NF-e de venda de veículo")).toBeVisible();
    expect(screen.getByText("Emitida")).toBeVisible();
    expect(screen.queryByText("SPEDY_API_TOKEN")).not.toBeInTheDocument();
    expect(screen.queryByText("spedy_private_123")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Emitir NF-e" }),
    ).not.toBeInTheDocument();
    expect(api.issueDocument).not.toHaveBeenCalled();
  });

  it("shows the expanded fiscal composer when the provider is configured", async () => {
    const api = createApi(true);
    render(<FiscalModule api={api} />);

    expect(await screen.findByLabelText("Tipo de nota")).toBeVisible();
    expect(screen.getByLabelText("Referencia externa")).toBeVisible();
    expect(screen.getByRole("button", { name: "Emitir" })).toBeVisible();
  });
});

function createApi(configured = false): FiscalApi {
  return {
    archiveRecipient: vi.fn(),
    archiveTemplate: vi.fn(),
    cancelDocument: vi.fn(),
    createRecipient: vi.fn(),
    createTemplate: vi.fn(),
    getOverview: vi.fn(async () => ({
      documents: [
        {
          accessKey: null,
          createdAt: "2026-07-11T12:00:00.000Z",
          documentKind: "nfe" as const,
          documentType: "nfe_vehicle_sale",
          id: "fiscal_1",
          issuedAt: "2026-07-11T12:00:00.000Z",
          metadata: {},
          provider: "spedy" as const,
          providerDocumentId: "spedy_private_123",
          recipientId: null,
          status: "issued" as const,
          templateId: null,
          templateVersion: null,
        },
      ],
      provider: {
        configured,
        missingConfiguration: configured ? [] : ["SPEDY_API_TOKEN"],
        provider: "spedy" as const,
        webhookConfigured: configured,
      },
      summary: { cancelled: 0, failed: 0, issued: 1, pending: 0 },
    })),
    issueDocument: vi.fn(async () => ({
      accessKey: null,
      createdAt: "2026-07-11T12:00:00.000Z",
      documentKind: "nfe" as const,
      documentType: "nfe_vehicle_sale",
      id: "fiscal_new",
      issuedAt: null,
      metadata: {},
      provider: "spedy" as const,
      providerDocumentId: null,
      recipientId: null,
      status: "draft" as const,
      templateId: null,
      templateVersion: null,
    })),
    listRecipients: vi.fn(async () => []),
    listTemplates: vi.fn(async () => []),
    previewTemplate: vi.fn(),
    repeatDocument: vi.fn(),
    syncDocumentStatus: vi.fn(),
  };
}
