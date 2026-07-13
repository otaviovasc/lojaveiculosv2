// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SaleWorkspace } from "./SaleWorkspace";
import type { SaleRecord } from "./types";

describe("SaleWorkspace", () => {
  afterEach(() => cleanup());

  it("runs lifecycle transitions with the saved sale returned by the API", async () => {
    const user = userEvent.setup();
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
    expect(reserveButton).toBeEnabled();
    await user.click(reserveButton);

    await waitFor(() => expect(onReserve).toHaveBeenCalledOnce());
    expect(onSave).toHaveBeenCalledOnce();
    expect(onReserve.mock.calls[0]?.[0].payments[0]?.id).toBe("server-payment");
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("saves pending sale edits before closing the reservation", async () => {
    const user = userEvent.setup();
    const pending = saleRecord({ status: "pending" });
    const saved = saleRecord({
      buyerSnapshot: {
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
    await user.click(screen.getByRole("button", { name: "Fechar Venda" }));

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(onSave).toHaveBeenCalledOnce();
    expect(onClose.mock.calls[0]?.[0]).toMatchObject({
      buyerSnapshot: { source: "server" },
      revision: 2,
    });
  });

  it("waits for an in-flight autosave before closing a pending sale", async () => {
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
    await user.click(screen.getByRole("button", { name: "Fechar Venda" }));

    expect(onSave).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();

    resolveSave?.(
      saleRecord({
        buyerSnapshot: {
          name: "Cliente QA",
          phone: "(11) 90000-0000",
          source: "server",
        },
        revision: 2,
        status: "pending",
      }),
    );

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(onSave).toHaveBeenCalledOnce();
    expect(onClose.mock.calls[0]?.[0]).toMatchObject({
      buyerSnapshot: { source: "server" },
      revision: 2,
    });
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
    expect(screen.getByRole("status")).toHaveTextContent(
      "Esta venda está em modo somente leitura",
    );
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
    expect(screen.getByRole("status")).toHaveTextContent("revisão histórica");
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
    buyerSnapshot: { name: "Cliente QA" },
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
    listingSnapshot: { title: "Audi A4" },
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

function payment(id: string): SaleRecord["payments"][number] {
  return {
    amountCents: 18990000,
    dueAt: null,
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
