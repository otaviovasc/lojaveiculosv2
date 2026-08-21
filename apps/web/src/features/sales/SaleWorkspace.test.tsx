// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SaleWorkspace } from "./SaleWorkspace";
import type { SaleContextOptions } from "./saleContextOptions";
import type { SaleRecord } from "./types";

describe("SaleWorkspace", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("runs lifecycle transitions with the saved sale returned by the API", async () => {
    const user = userEvent.setup();
    const clearTimeoutSpy = vi.spyOn(window, "clearTimeout");
    const clientSignalPayment = {
      ...payment("client-payment"),
      amountCents: 100000,
      principalCents: 100000,
    };
    const serverSignalPayment = {
      ...payment("server-payment"),
      amountCents: 100000,
      principalCents: 100000,
    };
    const draft = saleRecord({
      payments: [clientSignalPayment],
      status: "draft",
    });
    const saved = saleRecord({
      payments: [serverSignalPayment],
      revision: 2,
      status: "draft",
    });
    const onSave = vi.fn(async () => saved);
    const onReserve = vi.fn(async (sale: SaleRecord) => ({
      ...sale,
      status: "pending" as const,
    }));

    render(
      <SaleWorkspace
        onCancel={vi.fn()}
        onClose={vi.fn()}
        onReserve={onReserve}
        onRevert={vi.fn()}
        onSave={onSave}
        sale={draft}
      />,
    );

    await user.type(
      screen.getByPlaceholderText("Ex: (11) 99999-9999"),
      "(11) 90000-0000",
    );
    const reserveButton = screen.getByRole("button", {
      name: "Reservar Veículo",
    });
    expect(screen.getByRole("button", { name: "Fechar Venda" })).toBeDisabled();
    expect(reserveButton).toBeDisabled();
    await waitFor(() => expect(reserveButton).toBeEnabled(), { timeout: 1500 });
    const clearTimeoutCallsBeforeReserve = clearTimeoutSpy.mock.calls.length;
    await user.click(reserveButton);

    await waitFor(() => expect(onReserve).toHaveBeenCalledOnce());
    expect(onSave).toHaveBeenCalledOnce();
    expect(onReserve.mock.calls[0]?.[0].payments[0]?.id).toBe("server-payment");
    expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThan(
      clearTimeoutCallsBeforeReserve,
    );
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("saves pending sale edits before closing the reservation", async () => {
    const user = userEvent.setup();
    const pending = saleRecord({ status: "pending" });
    const saved = saleRecord({
      buyerSnapshot: {
        ...validBuyerSnapshot(),
        name: "Cliente QA",
        phone: "(11) 90000-0000",
        source: "server",
      },
      revision: 2,
      status: "pending",
    });
    const onSave = vi.fn(async () => saved);
    const onClose = vi.fn(async (sale: SaleRecord) => ({
      ...sale,
      status: "closed" as const,
    }));

    render(
      <SaleWorkspace
        onCancel={vi.fn()}
        onClose={onClose}
        onReserve={vi.fn()}
        onRevert={vi.fn()}
        onSave={onSave}
        sale={pending}
      />,
    );

    await user.type(
      screen.getByPlaceholderText("Ex: (11) 99999-9999"),
      "(11) 90000-0000",
    );
    await user.click(
      screen.getByRole("button", { name: /Valores, Pagos & Serviços/ }),
    );
    expect(screen.getByLabelText("Método de pagamento")).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Remover pagamento 1" }),
    ).toBeDisabled();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Fechar Venda" }),
      ).toBeEnabled(),
    );
    await user.click(screen.getByRole("button", { name: "Fechar Venda" }));
    const closeDialog = screen.getByRole("dialog", {
      name: "Fechar esta venda?",
    });
    expect(onClose).not.toHaveBeenCalled();
    await user.click(
      within(closeDialog).getByRole("button", {
        name: "Confirmar fechamento",
      }),
    );

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(onSave).toHaveBeenCalledOnce();
    expect(onClose.mock.calls[0]?.[0]).toMatchObject({
      buyerSnapshot: { source: "server" },
      revision: 2,
    });
  });

  it("keeps the sticky close action disabled until autosave finishes", async () => {
    const user = userEvent.setup();
    const pending = saleRecord({ status: "pending" });
    let resolveSave: ((sale: SaleRecord) => void) | undefined;
    const onSave = vi.fn(
      () =>
        new Promise<SaleRecord>((resolve) => {
          resolveSave = resolve;
        }),
    );
    const onClose = vi.fn(async (sale: SaleRecord) => ({
      ...sale,
      status: "closed" as const,
    }));

    render(
      <SaleWorkspace
        onCancel={vi.fn()}
        onClose={onClose}
        onReserve={vi.fn()}
        onRevert={vi.fn()}
        onSave={onSave}
        sale={pending}
      />,
    );

    await user.type(
      screen.getByPlaceholderText("Ex: (11) 99999-9999"),
      "(11) 90000-0000",
    );
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce(), {
      timeout: 1500,
    });
    expect(screen.getByRole("button", { name: "Fechar Venda" })).toBeDisabled();
    expect(onSave).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();

    resolveSave?.(
      saleRecord({
        buyerSnapshot: {
          ...validBuyerSnapshot(),
          name: "Cliente QA",
          phone: "(11) 90000-0000",
          source: "server",
        },
        revision: 2,
        status: "pending",
      }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Fechar Venda" }),
      ).toBeEnabled(),
    );
    await user.click(screen.getByRole("button", { name: "Fechar Venda" }));
    await user.click(
      within(
        screen.getByRole("dialog", { name: "Fechar esta venda?" }),
      ).getByRole("button", { name: "Confirmar fechamento" }),
    );

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(onSave).toHaveBeenCalledOnce();
    expect(onClose.mock.calls[0]?.[0]).toMatchObject({
      buyerSnapshot: { source: "server" },
      revision: 2,
    });
  });

  it("keeps incomplete draft steps blocked and explains what is missing", async () => {
    const user = userEvent.setup();
    render(
      <SaleWorkspace
        onCancel={vi.fn()}
        onClose={vi.fn()}
        onReserve={vi.fn()}
        onRevert={vi.fn()}
        onSave={vi.fn()}
        sale={saleRecord({ buyerSnapshot: { name: "" }, leadId: null })}
      />,
    );

    expect(
      screen.getByRole("button", { name: /Valores, Pagos & Serviços/ }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /Formalização & Download/ }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Avançar" })).toBeDisabled();
    expect(
      screen.getByText(/Complete antes de avançar: Comprador, Lead/),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Formalização & Download/ }),
    );
    expect(
      screen.getByRole("button", { name: /Veículo & Comprador/ }),
    ).toHaveAttribute("aria-current", "step");
  });

  it("keeps document-policy errors out of the close-ready state", async () => {
    const user = userEvent.setup();
    render(
      <SaleWorkspace
        onCancel={vi.fn()}
        onClose={vi.fn()}
        onReserve={vi.fn()}
        onRevert={vi.fn()}
        onSave={vi.fn()}
        sale={saleRecord({
          buyerSnapshot: { name: "Cliente QA" },
          listingSnapshot: { title: "Audi A4" },
        })}
      />,
    );

    expect(
      screen.getByRole("button", { name: /Documentos & Validação/ }),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: /Formalização & Download/ }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: "Fechar Venda" })).toBeDisabled();
    expect(screen.getByText("Pendências para fechar")).toBeInTheDocument();
    expect(
      screen.getByText(/CPF\/CNPJ, Endereço do comprador/),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Documentos & Validação/ }),
    );
    expect(
      screen.getByText(/Complete antes de avançar: CPF\/CNPJ/),
    ).toBeInTheDocument();
  });

  it("lets pending sales inspect every step without hiding recorded gaps", async () => {
    const user = userEvent.setup();
    render(
      <SaleWorkspace
        onCancel={vi.fn()}
        onClose={vi.fn()}
        onReserve={vi.fn()}
        onRevert={vi.fn()}
        onSave={vi.fn()}
        sale={saleRecord({ buyerSnapshot: { name: "" }, status: "pending" })}
      />,
    );

    const finalStep = screen.getByRole("button", {
      name: /Formalização & Download/,
    });
    expect(finalStep).toBeEnabled();
    await user.click(finalStep);
    expect(
      screen.getByText(/Pendências registradas nesta etapa: Comprador/),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Há pendências antes do fechamento"),
    ).toBeInTheDocument();
  });

  it("requires confirmation and allows cancelling any close request", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <SaleWorkspace
        onCancel={vi.fn()}
        onClose={onClose}
        onReserve={vi.fn()}
        onRevert={vi.fn()}
        onSave={vi.fn((sale: SaleRecord) => Promise.resolve(sale))}
        sale={saleRecord({ status: "pending" })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Fechar Venda" }));
    const dialog = screen.getByRole("dialog", { name: "Fechar esta venda?" });
    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    expect(onClose).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Fechar esta venda?" }),
      ).not.toBeInTheDocument(),
    );

    await user.click(
      screen.getByRole("button", { name: /Formalização & Download/ }),
    );
    await user.click(
      screen.getAllByRole("button", { name: "Fechar Venda" })[0]!,
    );
    await user.click(
      within(
        screen.getByRole("dialog", { name: "Fechar esta venda?" }),
      ).getByRole("button", { name: "Cancelar" }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Fechar esta venda?" }),
      ).not.toBeInTheDocument(),
    );
    await user.click(
      screen.getByRole("button", { name: "Fechar Venda Agora" }),
    );

    expect(
      screen.getByRole("dialog", { name: "Fechar esta venda?" }),
    ).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("only exposes reversal for the current closed revision", async () => {
    const user = userEvent.setup();
    const onRevert = vi.fn(async (sale: SaleRecord, _reason: string) => ({
      ...sale,
      correctionOfSaleId: sale.id,
      id: "sale_2",
      revision: 2,
      status: "draft" as const,
    }));
    render(
      <SaleWorkspace
        onCancel={vi.fn()}
        onClose={vi.fn()}
        onReserve={vi.fn()}
        onRevert={onRevert}
        onSave={vi.fn()}
        sale={saleRecord({ status: "closed" })}
      />,
    );

    expect(screen.getByText("Venda fechada")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Fechar Venda" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Reservar Veículo" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Cancelar/ }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reverter venda" }));
    const dialog = screen.getByRole("dialog", {
      name: "Reverter venda fechada",
    });
    await user.type(
      screen.getByLabelText("Motivo da correção"),
      "Corrigir comprador",
    );
    await user.click(
      screen.getAllByRole("button", { name: "Reverter venda" }).at(-1)!,
    );
    await waitFor(() => expect(onRevert).toHaveBeenCalledOnce());
    expect(onRevert.mock.calls[0]?.[1]).toBe("Corrigir comprador");
    expect(
      screen.getByText(/Esta venda está em modo somente leitura/),
    ).toBeInTheDocument();
  });

  it("hides reversal for a historical closed revision", () => {
    render(
      <SaleWorkspace
        onCancel={vi.fn()}
        onClose={vi.fn()}
        onReserve={vi.fn()}
        onRevert={vi.fn()}
        onSave={vi.fn()}
        sale={saleRecord({ isCurrentRevision: false, status: "closed" })}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Reverter venda" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/revisão histórica/)).toBeInTheDocument();
  });

  it("uses custom pickers without exposing fallback unit ids", () => {
    const { container } = render(
      <SaleWorkspace
        onCancel={vi.fn()}
        onClose={vi.fn()}
        onReserve={vi.fn()}
        onRevert={vi.fn()}
        onSave={vi.fn()}
        sale={saleRecord({ unitId: "unit_sensitive_123456" })}
      />,
    );

    expect(container.querySelector("select")).toBeNull();
    expect(
      screen.getByText("Nenhum veículo selecionado ainda."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/unit_sensitive/i)).not.toBeInTheDocument();
  });

  it("creates and links a CRM lead while filling vehicle identifiers", async () => {
    const user = userEvent.setup();
    const onCreateLead = vi.fn(async () => ({
      buyerEmail: "cliente@example.test",
      buyerName: "Cliente QA",
      buyerPhone: "(11) 99999-9999",
      detail: "Cliente QA",
      id: "lead_new",
      label: "Cliente QA",
      listingId: "listing_1",
      vehicleTitle: "Audi A4",
    }));
    const onSave = vi.fn(async (sale: SaleRecord) => sale);
    const contextOptions: SaleContextOptions = {
      leads: [],
      sellers: [],
      units: [
        {
          colorName: "white",
          detail: "EST-1 · ABC1D23",
          id: "unit_1",
          label: "Audi A4 · EST-1",
          listingId: "listing_1",
          listingTitle: "Audi A4",
          manufactureYear: 2025,
          mileageKm: 100,
          modelYear: 2026,
          plate: "ABC1D23",
          priceCents: 18990000,
          primaryMediaUrl: null,
          renavam: "12345678901",
          unitLabel: "EST-1",
          vin: "9BWZZZ377VT004251",
        },
      ],
    };

    render(
      <SaleWorkspace
        contextOptions={contextOptions}
        onCancel={vi.fn()}
        onClose={vi.fn()}
        onCreateLead={onCreateLead}
        onReserve={vi.fn()}
        onRevert={vi.fn()}
        onSave={onSave}
        sale={saleRecord({
          buyerSnapshot: {
            address: "Rua das Flores, 100",
            city: "São Paulo",
            document: "52998224725",
            email: "cliente@example.test",
            estadoCivil: "solteiro",
            name: "Cliente QA",
            nacionalidade: "brasileira",
            phone: "(11) 99999-9999",
            profissao: "comerciante",
            state: "SP",
          },
          leadId: null,
          listingId: "listing_1",
          status: "pending",
        })}
      />,
    );

    expect(screen.getByText("Branco")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fechar Venda" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Criar novo lead" }));
    await user.click(
      screen.getByRole("button", { name: "Criar lead e vincular à venda" }),
    );

    await waitFor(() => expect(onCreateLead).toHaveBeenCalledOnce());
    expect(onCreateLead).toHaveBeenCalledWith({
      buyerEmail: "cliente@example.test",
      buyerName: "Cliente QA",
      buyerPhone: "(11) 99999-9999",
      listingId: "listing_1",
      saleId: "sale_1",
    });
    expect(
      await screen.findByText("Lead criado e vinculado a esta venda."),
    ).toBeInTheDocument();
    await waitFor(() => expect(onSave).toHaveBeenCalled(), { timeout: 1500 });
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Fechar Venda" }),
      ).toBeEnabled(),
    );
    expect(onSave.mock.calls.at(-1)?.[0]).toMatchObject({
      leadId: "lead_new",
      listingSnapshot: {
        chassi: "9BWZZZ377VT004251",
        renavam: "12345678901",
      },
    });
  });

  it("persists only renderable document selections and does not offer warranty", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async (sale: SaleRecord) => sale);

    render(
      <SaleWorkspace
        onCancel={vi.fn()}
        onClose={vi.fn()}
        onReserve={vi.fn()}
        onRevert={vi.fn()}
        onSave={onSave}
        sale={saleRecord()}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /Documentos & Validação/ }),
    );
    expect(screen.queryByText("Garantia de Venda")).not.toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "Recibo de Venda" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce(), {
      timeout: 1500,
    });
    expect(onSave.mock.calls[0]?.[0].selectedDocumentKinds).toEqual([
      "sale_contract",
      "delivery_term",
      "power_of_attorney",
    ]);
  });
});

function saleRecord(overrides: Partial<SaleRecord> = {}): SaleRecord {
  return {
    buyerSnapshot: validBuyerSnapshot(),
    closedAt: null,
    correctionOfSaleId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    documentPolicySnapshot: {
      requiredDocumentKinds: [
        "sale_contract",
        "sale_receipt",
        "delivery_term",
        "power_of_attorney",
      ],
    },
    id: "sale_1",
    isCurrentRevision: true,
    leadId: "lead_1",
    listingId: null,
    listingSnapshot: {
      chassi: "9BWZZZ377VT004251",
      renavam: "12345678901",
      title: "Audi A4",
    },
    overrideReason: null,
    overrideRequiredFields: false,
    payments: [payment("payment_1")],
    revision: 1,
    salePriceCents: 18990000,
    saleSourceSnapshot: { source: "lead" },
    selectedDocumentKinds: [
      "sale_contract",
      "sale_receipt",
      "delivery_term",
      "power_of_attorney",
    ],
    sellerUserId: "seller_1",
    status: "draft",
    unitId: "unit_1",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function validBuyerSnapshot(): Record<string, unknown> {
  return {
    address: "Rua das Flores, 100",
    city: "São Paulo",
    document: "52998224725",
    estadoCivil: "solteiro",
    name: "Cliente QA",
    nacionalidade: "brasileira",
    profissao: "comerciante",
    state: "SP",
  };
}

function payment(id: string): SaleRecord["payments"][number] {
  return {
    amountCents: 18990000,
    dueAt: "2026-01-15",
    extraCents: 0,
    id,
    installments: null,
    metadata: {},
    method: "pix",
    paidAt: null,
    principalCents: 18990000,
    providerPaymentId: null,
    status: "pending",
  };
}
