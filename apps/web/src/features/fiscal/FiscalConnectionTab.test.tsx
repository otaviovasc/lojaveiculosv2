// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppApiError } from "../../lib/apiErrors";
import type { FiscalApi } from "./apiClient";
import {
  createConnection,
  createImportedTaxDefaults,
} from "./fiscalConnectionFixtures";
import { FiscalConnectionTab } from "./FiscalConnectionTab";

describe("FiscalConnectionTab", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(cleanup);

  it("requires explicit acknowledgment before confirming imported defaults", async () => {
    const taxDefaults = createImportedTaxDefaults({ icmsAliquota: 18 });
    const reviewed = createConnection({
      companyId: "spedy_company_1",
      defaultsStatus: "confirmed",
      status: "pending_review",
      taxDefaults,
    });
    const api = createApi({
      confirmDefaults: vi.fn(async () => reviewed),
    });
    const onConnectionChange = vi.fn();
    const connection = createConnection({
      companyId: "spedy_company_1",
      defaultsStatus: "unconfirmed",
      status: "pending_review",
      taxDefaults,
    });
    render(
      <FiscalConnectionTab
        api={api}
        connection={connection}
        onConnectionChange={onConnectionChange}
      />,
    );

    expect(
      screen.getByText(/importados da Spedy e ainda não foram confirmados/),
    ).toBeVisible();

    const confirmButton = screen.getByRole("button", {
      name: "Confirmar padrões fiscais",
    });
    expect(confirmButton).toBeDisabled();
    expect(api.confirmDefaults).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByLabelText("Confirmo que revisei os padrões fiscais"),
    );
    expect(confirmButton).toBeEnabled();

    fireEvent.click(confirmButton);
    await waitFor(() =>
      expect(api.confirmDefaults).toHaveBeenCalledWith({
        taxDefaults: {
          icmsAliquota: 18,
          nfe: {
            cfop: 5102,
            cofinsCst: "01",
            destination: "internal",
            icmsCst: "00",
            icmsOrigin: 0,
            isFinalCustomer: true,
            ncm: "8703",
            operationNature: "Venda de veículo",
            operationType: "outgoing",
            pisCst: "01",
            presenceType: "presence",
            purposeType: "normal",
          },
          nfse: {
            taxLocation: "companyMunicipality",
            taxationType: "taxationInMunicipality",
          },
        },
      }),
    );
    expect(onConnectionChange).toHaveBeenCalledWith(reviewed);
  });

  it("guides the store through missing required nested fields", async () => {
    const imported = createImportedTaxDefaults();
    const connection = createConnection({
      companyId: "spedy_company_1",
      defaultsStatus: "unconfirmed",
      status: "pending_review",
      taxDefaults: { nfe: imported.nfe },
    });
    const confirmedConnection = createConnection({
      companyId: "spedy_company_1",
      defaultsStatus: "confirmed",
      status: "pending_review",
      taxDefaults: imported,
    });
    const api = createApi({
      confirmDefaults: vi.fn(async () => confirmedConnection),
    });
    render(
      <FiscalConnectionTab
        api={api}
        connection={connection}
        onConnectionChange={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/Campos obrigatórios pendentes:/),
    ).toHaveTextContent("Local de incidência do ISS");
    expect(
      screen.getByText(/Campos obrigatórios pendentes:/),
    ).toHaveTextContent("Tipo de tributação do ISS");

    fireEvent.click(
      screen.getByLabelText("Confirmo que revisei os padrões fiscais"),
    );
    const confirmButton = screen.getByRole("button", {
      name: "Confirmar padrões fiscais",
    });
    expect(confirmButton).toBeDisabled();

    selectOption("Local de incidência do ISS", "Município da empresa");
    selectOption("Tipo de tributação do ISS", "Tributação no município");

    expect(confirmButton).toBeEnabled();
    fireEvent.click(confirmButton);
    await waitFor(() =>
      expect(api.confirmDefaults).toHaveBeenCalledWith({
        taxDefaults: imported,
      }),
    );
  });

  it("shows friendly backend errors with the request id and missing fields", async () => {
    const api = createApi({
      confirmDefaults: vi.fn(async () => {
        throw new AppApiError({
          code: "FISCAL_DEFAULTS_VALIDATION_ERROR",
          details: { missingFields: ["nfe.cfop", "nfse.taxLocation"] },
          message: "taxDefaults missing",
          requestId: "req_123",
          status: 400,
        });
      }),
    });
    render(
      <FiscalConnectionTab
        api={api}
        connection={createConnection({
          companyId: "spedy_company_1",
          defaultsStatus: "unconfirmed",
          status: "pending_review",
          taxDefaults: createImportedTaxDefaults(),
        })}
        onConnectionChange={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByLabelText("Confirmo que revisei os padrões fiscais"),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar padrões fiscais" }),
    );

    const alerts = await screen.findAllByRole("alert");
    const alert = alerts.find((element) =>
      element.textContent?.includes("Revise os campos informados"),
    );
    expect(alert).toBeDefined();
    expect(alert).toHaveTextContent(
      "Revise os campos informados e tente novamente.",
    );
    expect(alert).toHaveTextContent("ID do erro: req_123");
    expect(alert).toHaveTextContent(
      "Campos pendentes segundo a API: CFOP padrão, Local de incidência do ISS.",
    );
    expect(alert).not.toHaveTextContent("taxDefaults missing");
  });

  it("uploads the A1 certificate without retaining the password or file", async () => {
    const updated = createConnection({
      certificateExpiresAt: "2027-01-10T00:00:00.000Z",
      companyId: "spedy_company_1",
      status: "pending_review",
    });
    const api = createApi({
      uploadCertificate: vi.fn(async () => updated),
    });
    const onConnectionChange = vi.fn();
    render(
      <FiscalConnectionTab
        api={api}
        connection={createConnection({ companyId: "spedy_company_1" })}
        onConnectionChange={onConnectionChange}
      />,
    );

    const certificate = new File(["pfx-bytes"], "certificado.pfx", {
      type: "application/x-pkcs12",
    });
    fireEvent.change(screen.getByLabelText("Arquivo do certificado A1"), {
      target: { files: [certificate] },
    });
    const passwordInput = screen.getByLabelText("Senha do certificado");
    fireEvent.change(passwordInput, { target: { value: "super-secret" } });

    fireEvent.click(screen.getByRole("button", { name: "Enviar certificado" }));

    expect(api.uploadCertificate).toHaveBeenCalledWith({
      certificate,
      password: "super-secret",
    });
    const toast = await screen.findByRole("status");
    expect(toast).toHaveTextContent("Certificado A1 enviado com sucesso.");
    expect(onConnectionChange).toHaveBeenCalledWith(updated);
    // The password field is cleared and nothing touches browser storage.
    expect(passwordInput).toHaveValue("");
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("submits the issuer profile in the API contract shape", async () => {
    const configured = createConnection({
      companyId: "spedy_company_1",
      status: "pending_review",
    });
    const api = createApi({
      setupConnection: vi.fn(async () => configured),
    });
    render(
      <FiscalConnectionTab
        api={api}
        connection={createConnection()}
        onConnectionChange={vi.fn()}
      />,
    );

    fill("Nome fantasia", "Loja Exemplo");
    fill("Razão social", "Loja Exemplo LTDA");
    fill("CNPJ", "12.345.678/0001-90");
    fill("Logradouro", "Rua das Flores");
    fill("Número", "100");
    fill("Bairro", "Centro");
    fill("CEP", "01001-000");
    fill("Município", "São Paulo");
    fill("UF", "sp");
    fill("Código IBGE do município", "3550308");

    fireEvent.click(
      screen.getByRole("button", { name: "Salvar e criar empresa" }),
    );

    expect(api.setupConnection).toHaveBeenCalledWith({
      issuerProfile: {
        address: {
          city: { code: 3550308, name: "São Paulo", state: "SP" },
          district: "Centro",
          number: "100",
          postalCode: "01001000",
          street: "Rua das Flores",
        },
        federalTaxNumber: "12345678000190",
        legalName: "Loja Exemplo LTDA",
        name: "Loja Exemplo",
      },
    });
  });

  it("masks CNPJ, phone, and CEP while typing and submits normalized data", async () => {
    const configured = createConnection({
      companyId: "spedy_company_1",
      status: "pending_review",
    });
    const api = createApi({
      setupConnection: vi.fn(async () => configured),
    });
    render(
      <FiscalConnectionTab
        api={api}
        connection={createConnection()}
        onConnectionChange={vi.fn()}
      />,
    );

    fill("Nome fantasia", "Loja Exemplo");
    fill("Razão social", "Loja Exemplo LTDA");
    fill("CNPJ", "12345678000190");
    fill("Telefone", "11987654321");
    fill("Logradouro", "Rua das Flores");
    fill("Número", "100");
    fill("Bairro", "Centro");
    fill("CEP", "01001000");
    fill("Município", "São Paulo");
    fill("UF", "sp");
    fill("Código IBGE do município", "3550308");

    expect(screen.getByLabelText("CNPJ")).toHaveValue("12.345.678/0001-90");
    expect(screen.getByLabelText("Telefone")).toHaveValue("(11) 98765-4321");
    expect(screen.getByLabelText("CEP")).toHaveValue("01001-000");

    fireEvent.click(
      screen.getByRole("button", { name: "Salvar e criar empresa" }),
    );

    expect(api.setupConnection).toHaveBeenCalledWith({
      issuerProfile: {
        address: {
          city: { code: 3550308, name: "São Paulo", state: "SP" },
          district: "Centro",
          number: "100",
          postalCode: "01001000",
          street: "Rua das Flores",
        },
        federalTaxNumber: "12345678000190",
        legalName: "Loja Exemplo LTDA",
        name: "Loja Exemplo",
        phone: "(11) 98765-4321",
      },
    });
  });

  it("syncs the connection from the status panel", async () => {
    const synced = createConnection({
      companyId: "spedy_company_1",
      lastSyncedAt: "2026-07-27T12:00:00.000Z",
      status: "pending_review",
    });
    const api = createApi({ syncConnection: vi.fn(async () => synced) });
    const onConnectionChange = vi.fn();
    render(
      <FiscalConnectionTab
        api={api}
        connection={createConnection({ companyId: "spedy_company_1" })}
        onConnectionChange={onConnectionChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Sincronizar" }));
    await waitFor(() =>
      expect(onConnectionChange).toHaveBeenCalledWith(synced),
    );
    expect(api.syncConnection).toHaveBeenCalled();
  });
});

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function selectOption(label: string, optionLabel: string) {
  fireEvent.click(screen.getByLabelText(label));
  fireEvent.click(screen.getByRole("option", { name: optionLabel }));
}

function createApi(overrides: Partial<FiscalApi> = {}): FiscalApi {
  return {
    archiveRecipient: vi.fn(),
    archiveTemplate: vi.fn(),
    cancelDocument: vi.fn(),
    confirmDefaults: vi.fn(),
    createRecipient: vi.fn(),
    createTemplate: vi.fn(),
    downloadDocumentArtifact: vi.fn(),
    getConnection: vi.fn(),
    getOverview: vi.fn(),
    issueDocument: vi.fn(),
    listRecipients: vi.fn(),
    listTemplates: vi.fn(),
    previewTemplate: vi.fn(),
    repeatDocument: vi.fn(),
    setupConnection: vi.fn(),
    syncConnection: vi.fn(),
    syncDocumentStatus: vi.fn(),
    uploadCertificate: vi.fn(),
    ...overrides,
  } as FiscalApi;
}
