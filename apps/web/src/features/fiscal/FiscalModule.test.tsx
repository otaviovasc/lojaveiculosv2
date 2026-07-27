// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FiscalApi } from "./apiClient";
import { createConnection } from "./fiscalConnectionFixtures";
import { FiscalModule } from "./FiscalModule";
import type { FiscalConnection, FiscalDocument } from "./types";

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

  it("uses semantic labels and blocks emission while the connection is not ready", async () => {
    const api = createApi();
    render(<FiscalModule api={api} />);

    expect(
      await screen.findByRole("heading", { name: "Notas fiscais", level: 1 }),
    ).toBeVisible();
    expect(
      await screen.findByText("Integração fiscal incompleta"),
    ).toBeVisible();
    expect(screen.getByText("Credencial de acesso à Spedy")).toBeVisible();
    expect(screen.queryByText("SPEDY_API_TOKEN")).not.toBeInTheDocument();
    expect(screen.queryByText("spedy_private_123")).not.toBeInTheDocument();
    expect(api.issueDocument).not.toHaveBeenCalled();

    // The composer stays blocked until the connection is ready.
    screen.getByRole("button", { name: "Emitir documento" }).click();
    expect(
      await screen.findByRole("heading", { name: "Emissão bloqueada" }),
    ).toBeVisible();
    expect(
      screen.queryByLabelText("Referência externa"),
    ).not.toBeInTheDocument();
    expect(api.issueDocument).not.toHaveBeenCalled();
  });

  it("shows the fiscal composer on the Emitir tab when the connection is ready", async () => {
    const api = createApi({ configured: true, connectionStatus: "ready" });
    render(<FiscalModule api={api} />);

    expect(
      await screen.findByRole("heading", { name: "Notas fiscais", level: 1 }),
    ).toBeVisible();
    expect(
      screen.queryByText("Integração fiscal incompleta"),
    ).not.toBeInTheDocument();

    screen.getByRole("tab", { name: "Emitir" }).click();
    expect(
      await screen.findByRole("heading", { name: "Emitir documento" }),
    ).toBeVisible();
    expect(
      screen.getByRole("group", { name: "Tipo de nota" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Referência externa")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Avançar" })).toBeVisible();
  });

  it("renders the connection tab with status, checklist and setup sections", async () => {
    const api = createApi();
    render(<FiscalModule api={api} />);

    expect(
      await screen.findByRole("heading", { name: "Notas fiscais", level: 1 }),
    ).toBeVisible();
    screen.getByRole("tab", { name: "Conexão" }).click();

    expect(await screen.findByText("Não configurada")).toBeVisible();
    expect(screen.getByText("Empresa emissora criada")).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Empresa emissora" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Certificado digital A1" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Padrões fiscais da loja" }),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Nenhum padrão fiscal importado ainda. Salve os dados da empresa e sincronize com o provedor para importar os valores.",
      ),
    ).toBeVisible();
  });

  it("lists documents on the Notas tab and filters by KPI status", async () => {
    const api = createApi({ configured: true });
    render(<FiscalModule api={api} />);

    // Desktop table + mobile cards both render in jsdom.
    expect((await screen.findAllByText("Maria Silva")).length).toBeGreaterThan(
      0,
    );
    expect(
      screen.getAllByText(/NF-e de venda de veículo/).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Emitida").length).toBeGreaterThan(0);

    // KPI click filters the list to the failed bucket.
    fireEvent.click(screen.getByRole("button", { name: "Filtrar por Falhas" }));
    await waitFor(() =>
      expect(screen.queryAllByText("Maria Silva")).toHaveLength(0),
    );
    expect(screen.getAllByText("Loja Parceira").length).toBeGreaterThan(0);

    // Clicking again clears the filter.
    fireEvent.click(screen.getByRole("button", { name: "Filtrar por Falhas" }));
    expect((await screen.findAllByText("Maria Silva")).length).toBeGreaterThan(
      0,
    );
  });
});

function createDocument(
  overrides: Partial<FiscalDocument> & { id: string },
): FiscalDocument {
  return {
    accessKey: null,
    createdAt: "2026-07-11T12:00:00.000Z",
    documentKind: "nfe",
    documentType: "nfe_vehicle_sale",
    issuedAt: null,
    metadata: {},
    provider: "spedy",
    providerDocumentId: null,
    recipientId: null,
    status: "issued",
    templateId: null,
    templateVersion: null,
    ...overrides,
  };
}

function createApi({
  configured = false,
  connectionStatus = "not_configured",
}: {
  configured?: boolean;
  connectionStatus?: FiscalConnection["status"];
} = {}): FiscalApi {
  const connection = createConnection(
    connectionStatus === "ready"
      ? {
          capabilities: { nfe: true, requiresDigitalCertificate: true },
          certificateExpiresAt: "2027-01-10T00:00:00.000Z",
          companyId: "spedy_company_1",
          defaultsConfirmedAt: "2026-07-10T12:00:00.000Z",
          defaultsStatus: "confirmed",
          lastSyncedAt: "2026-07-10T12:00:00.000Z",
          status: "ready",
          taxDefaults: { cfop: "5.102" },
          webhookRegisteredAt: "2026-07-10T12:00:00.000Z",
        }
      : {},
  );
  return {
    archiveRecipient: vi.fn(),
    archiveTemplate: vi.fn(),
    cancelDocument: vi.fn(),
    confirmDefaults: vi.fn(async () => connection),
    createRecipient: vi.fn(),
    createTemplate: vi.fn(),
    getConnection: vi.fn(async () => connection),
    getOverview: vi.fn(async () => ({
      documents: [
        createDocument({
          id: "fiscal_1",
          issuedAt: "2026-07-11T12:00:00.000Z",
          metadata: {
            recipient: { document: "12345678900", name: "Maria Silva" },
            vehicleNfe: { sale: { price: 85000 } },
          },
          providerDocumentId: "spedy_private_123",
          status: "issued",
        }),
        createDocument({
          id: "fiscal_2",
          metadata: {
            message: "CFOP inválido para a operação",
            recipient: { document: "98765432000100", name: "Loja Parceira" },
          },
          providerDocumentId: "spedy_private_456",
          status: "rejected",
        }),
      ],
      provider: {
        configured,
        missingConfiguration: configured ? [] : ["SPEDY_API_TOKEN"],
        provider: "spedy" as const,
        webhookConfigured: configured,
      },
      summary: { cancelled: 0, failed: 1, issued: 1, pending: 0 },
    })),
    issueDocument: vi.fn(),
    listRecipients: vi.fn(async () => []),
    listTemplates: vi.fn(async () => []),
    previewTemplate: vi.fn(),
    repeatDocument: vi.fn(),
    setupConnection: vi.fn(async () => connection),
    syncConnection: vi.fn(async () => connection),
    syncDocumentStatus: vi.fn(),
    uploadCertificate: vi.fn(async () => connection),
  };
}
