// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  InventoryListingTable,
  InventoryListingLoadingTable,
} from "./InventoryListingTable";

afterEach(cleanup);

describe("InventoryListingLoadingTable", () => {
  it("renders table skeleton with accessible loading state and headers", () => {
    render(<InventoryListingLoadingTable />);

    const table = screen.getByRole("status", {
      name: "Carregando veículos",
    });
    expect(table).toBeInTheDocument();
    expect(screen.getByText("Fotos")).toBeInTheDocument();
    expect(screen.getByText("Placa")).toBeInTheDocument();
    expect(screen.getByText("Marca/Modelo")).toBeInTheDocument();
    expect(screen.getByText("Ano/KM")).toBeInTheDocument();
    expect(screen.getByText("Preço")).toBeInTheDocument();
    expect(screen.getByText("Dias")).toBeInTheDocument();
    expect(screen.getByText("Fase")).toBeInTheDocument();
    expect(screen.getByText("Leads")).toBeInTheDocument();
    expect(screen.getByText("Ações")).toBeInTheDocument();
  });

  it("respects hidden columns in table skeleton", () => {
    render(
      <InventoryListingLoadingTable
        visibleColumns={{
          fotos: false,
          placa: true,
          marcaModelo: true,
          anoKm: false,
          preco: true,
          dias: false,
          fase: false,
          leads: false,
          acoes: false,
        }}
      />,
    );

    expect(screen.queryByText("Fotos")).not.toBeInTheDocument();
    expect(screen.getByText("Placa")).toBeInTheDocument();
    expect(screen.getByText("Marca/Modelo")).toBeInTheDocument();
    expect(screen.queryByText("Ano/KM")).not.toBeInTheDocument();
    expect(screen.getByText("Preço")).toBeInTheDocument();
  });
});
