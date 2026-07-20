// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { InventoryListingDetail } from "../inventory/model/types";
import type { SaleRecord } from "../sales/types";
import type { FiscalApi } from "./apiClient";
import { FiscalIssueComposer } from "./FiscalIssueComposer";

describe("FiscalIssueComposer fills", () => {
  afterEach(cleanup);

  it("fills buyer, vehicle and items from a linked sale", async () => {
    render(
      <FiscalIssueComposer
        api={createFiscalApi()}
        inventoryApi={{
          getListing: vi.fn(async () => listingDetail()),
        }}
        salesApi={{ list: vi.fn(async () => [saleRecord()]) }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Venda/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Audi A4/ }));

    fireEvent.click(screen.getByRole("tab", { name: "2. Destinatário" }));
    expect(await screen.findByLabelText("Nome do destinatário")).toHaveValue(
      "Maria Silva",
    );
    expect(screen.getByLabelText("CPF ou CNPJ do destinatário")).toHaveValue(
      "123.456.789-00",
    );
    expect(screen.getByLabelText("E-mail do destinatário")).toHaveValue(
      "maria@example.com",
    );

    fireEvent.click(screen.getByRole("tab", { name: "3. Itens e veículo" }));
    expect(await screen.findByLabelText("Placa")).toHaveValue("ABC1D23");
    // Filled asynchronously from the inventory listing (not the sale snapshot).
    expect(await screen.findByLabelText("Chassi")).toHaveValue(
      "9BWZZZ377VT004251",
    );
    expect(screen.getByLabelText("Ano modelo")).toHaveValue("2023");
    expect(screen.getByLabelText("Hodômetro")).toHaveValue("42000");
  });

  it("fills the NFS-e tomador from the fiscal catalog", async () => {
    render(<FiscalIssueComposer api={createFiscalApi()} />);

    fireEvent.click(screen.getByRole("button", { name: /NFS-e \(serviço\)/ }));
    fireEvent.click(screen.getByRole("tab", { name: "2. Destinatário" }));

    const select = await screen.findByLabelText("Financeira / Tomador");
    fireEvent.change(select, { target: { value: "recipient_1" } });
    expect(select).toHaveValue("recipient_1");
  });
});

function createFiscalApi(): FiscalApi {
  return {
    archiveRecipient: vi.fn(),
    archiveTemplate: vi.fn(),
    cancelDocument: vi.fn(),
    createRecipient: vi.fn(),
    createTemplate: vi.fn(),
    getOverview: vi.fn(),
    issueDocument: vi.fn(),
    listRecipients: vi.fn(async () => [
      {
        document: "98765432000100",
        id: "recipient_1",
        legalName: "Banco Parceiro",
      },
    ]),
    listTemplates: vi.fn(async () => []),
    previewTemplate: vi.fn(),
    repeatDocument: vi.fn(),
    syncDocumentStatus: vi.fn(),
  } as unknown as FiscalApi;
}

function saleRecord(): SaleRecord {
  return {
    buyerSnapshot: {
      document: "12345678900",
      email: "maria@example.com",
      name: "Maria Silva",
      phone: "11999990000",
    },
    closedAt: null,
    correctionOfSaleId: null,
    createdAt: "2026-07-11T12:00:00.000Z",
    documentPolicySnapshot: {},
    id: "sale_1",
    isCurrentRevision: true,
    leadId: null,
    listingId: "listing_1",
    listingSnapshot: {
      colorName: "Prata",
      plate: "ABC1D23",
      title: "Audi A4",
    },
    overrideReason: null,
    overrideRequiredFields: false,
    payments: [],
    revision: 1,
    salePriceCents: 18500000,
    saleSourceSnapshot: {
      commission: { enabled: false, ruleType: "percentage" },
      documentation: { hasLien: null, status: "pending" },
      financing: { rank: "R1", status: "pending" },
      insurance: { appliedCommissionPercentage: 10, status: "pending" },
      source: "test",
    },
    selectedDocumentKinds: [],
    sellerUserId: null,
    status: "closed",
    unitId: "unit_1",
    updatedAt: "2026-07-11T12:00:00.000Z",
  } as unknown as SaleRecord;
}

function listingDetail(): InventoryListingDetail {
  return {
    checklists: [],
    costs: [],
    documents: [],
    listing: {
      fuelType: "flex",
      id: "listing_1",
      manufactureYear: 2022,
      mileageKm: 42000,
      modelYear: 2023,
      plate: null,
      priceCents: 18500000,
      title: "Audi A4",
    },
    media: [],
    priceHistory: [],
    status: "ready",
    statusHistory: [],
    units: [
      {
        colorName: "Prata",
        id: "unit_1",
        listingId: "listing_1",
        plate: "ABC1D23",
        status: "sold",
        vin: "9BWZZZ377VT004251",
      },
    ],
  } as unknown as InventoryListingDetail;
}
