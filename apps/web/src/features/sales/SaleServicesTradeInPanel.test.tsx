// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SnapshotRecord } from "./salesSnapshot";
import type { SaleRecord } from "./types";
import { TradeInPanel } from "./SaleServicesTradeInPanel";

afterEach(cleanup);

describe("TradeInPanel vehicle fields", () => {
  it("lists the required trade-in facts and prevents an incomplete payment sync", () => {
    render(
      <TradeInPanel
        inventoryApi={null}
        onChange={vi.fn()}
        onSyncPayment={vi.fn()}
        sale={{ buyerSnapshot: {}, payments: [] } as unknown as SaleRecord}
        tradeIn={{ enabled: true, valuationCents: 50_000 } as SnapshotRecord}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "8 campos obrigatórios pendentes",
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Chassi do veículo da troca",
    );
    expect(screen.getByLabelText(/^Placa/)).toBeRequired();
    expect(
      screen.getByLabelText(/^Valor de avaliação \/ entrada/),
    ).toBeRequired();
    expect(
      screen.getByRole("button", {
        name: "Lançar na Tabela de Pagamentos",
      }),
    ).toBeDisabled();
  });

  it("enables the canonical payment sync when all required facts are valid", () => {
    render(
      <TradeInPanel
        inventoryApi={null}
        onChange={vi.fn()}
        onSyncPayment={vi.fn()}
        sale={{ buyerSnapshot: {}, payments: [] } as unknown as SaleRecord}
        tradeIn={
          {
            brand: "Honda",
            chassi: "9BWZZZ377VT004251",
            color: "preto",
            enabled: true,
            model: "Civic",
            plate: "ABC1D23",
            renavam: "12345678901",
            valuationCents: 50_000,
            yearFabrication: 2023,
            yearModel: 2024,
          } as SnapshotRecord
        }
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Cadastro da troca completo",
    );
    expect(
      screen.getByRole("button", {
        name: "Lançar na Tabela de Pagamentos",
      }),
    ).toBeEnabled();
  });

  it("normalizes vehicle identifiers and mileage before updating the draft", () => {
    const onChange = vi.fn();
    render(
      <TradeInPanel
        inventoryApi={null}
        onChange={onChange}
        sale={{ buyerSnapshot: {}, payments: [] } as unknown as SaleRecord}
        tradeIn={{ enabled: true } as SnapshotRecord}
      />,
    );

    fireEvent.change(screen.getByLabelText(/^Placa/), {
      target: { value: "abc-1d23 extra" },
    });
    expect(onChange).toHaveBeenLastCalledWith("tradeIn", "plate", "ABC1D23");

    fireEvent.change(screen.getByLabelText(/^Chassi \/ VIN/), {
      target: { value: "9bw zzZ-377-vt004251" },
    });
    expect(onChange).toHaveBeenLastCalledWith(
      "tradeIn",
      "chassi",
      "9BWZZZ377VT004251",
    );

    fireEvent.change(screen.getByLabelText(/^Renavam/), {
      target: { value: "001.234.567-89 extra" },
    });
    expect(onChange).toHaveBeenLastCalledWith(
      "tradeIn",
      "renavam",
      "00123456789",
    );

    fireEvent.change(screen.getByLabelText("Quilometragem"), {
      target: { value: "32.500 km" },
    });
    expect(onChange).toHaveBeenLastCalledWith("tradeIn", "mileageKm", 32_500);
  });
});
