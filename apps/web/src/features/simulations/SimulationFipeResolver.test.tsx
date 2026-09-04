// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SimulationFipeResolver } from "./SimulationFipeResolver";
import type { CredereFipeCandidate } from "./types";

const candidate: CredereFipeCandidate = {
  brand: "VW",
  fipeCode: "005340-6",
  fuelType: "Flex",
  modelId: "model_1",
  molicarCode: "01906108-0",
  name: "Gol",
  version: "1.0 MPI",
  yearEnd: 2025,
  yearStart: 2020,
};

describe("SimulationFipeResolver", () => {
  afterEach(cleanup);

  it("automatically queries Credere when valid FIPE and year are present, then confirms explicit choice", async () => {
    const user = userEvent.setup();
    const onResolve = vi
      .fn()
      .mockResolvedValueOnce({ candidates: [candidate], status: "ambiguous" })
      .mockResolvedValueOnce({ candidate, status: "resolved" });
    const onSelect = vi.fn();

    render(
      <SimulationFipeResolver
        fipeCode="005340-6"
        modelYear="2023"
        onFipeCodeChange={vi.fn()}
        onResolve={onResolve}
        onSelect={onSelect}
        selected={null}
      />,
    );

    // Auto-fetch should have triggered onResolve automatically without clicking "Consultar Credere"
    const candidateButton = await screen.findByRole("button", {
      name: /Selecionar 1.0 MPI, Molicar 01906108-0/,
    });
    expect(candidateButton).toBeInTheDocument();
    expect(onResolve).toHaveBeenNthCalledWith(1, {
      fipeCode: "005340-6",
      modelYear: 2023,
    });

    await user.click(candidateButton);

    await waitFor(() => expect(onSelect).toHaveBeenCalledWith(candidate));
    expect(onResolve).toHaveBeenNthCalledWith(2, {
      fipeCode: "005340-6",
      modelYear: 2023,
      selectedModelId: "model_1",
      selectedMolicarCode: "01906108-0",
    });
  });

  it("shows an explicit not-found state automatically", async () => {
    render(
      <SimulationFipeResolver
        fipeCode="005340-6"
        modelYear="2023"
        onFipeCodeChange={vi.fn()}
        onResolve={vi.fn(async () => ({
          candidates: [] as [],
          status: "not_found" as const,
        }))}
        onSelect={vi.fn()}
        selected={null}
      />,
    );

    expect(
      await screen.findByText(/não encontrou uma versão Molicar disponível/i),
    ).toBeInTheDocument();
  });

  it("ignores a stale FIPE response after the operator changes the vehicle", async () => {
    let resolveFirst!: (value: {
      candidates: CredereFipeCandidate[];
      status: "ambiguous";
    }) => void;
    const first = new Promise<{
      candidates: CredereFipeCandidate[];
      status: "ambiguous";
    }>((resolve) => {
      resolveFirst = resolve;
    });
    const newerCandidate = {
      ...candidate,
      fipeCode: "001004-9",
      modelId: "model_2",
      name: "Uno",
      version: "1.0 Fire",
    };
    const onResolve = vi
      .fn()
      .mockReturnValueOnce(first)
      .mockResolvedValueOnce({
        candidates: [newerCandidate],
        status: "ambiguous",
      });
    const { rerender } = render(
      <SimulationFipeResolver
        fipeCode="005340-6"
        modelYear="2023"
        onFipeCodeChange={vi.fn()}
        onResolve={onResolve}
        onSelect={vi.fn()}
        selected={null}
      />,
    );

    rerender(
      <SimulationFipeResolver
        fipeCode="001004-9"
        modelYear="2023"
        onFipeCodeChange={vi.fn()}
        onResolve={onResolve}
        onSelect={vi.fn()}
        selected={null}
      />,
    );
    expect(
      await screen.findByRole("button", { name: /Selecionar 1.0 Fire/ }),
    ).toBeVisible();

    resolveFirst({ candidates: [candidate], status: "ambiguous" });
    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: /Selecionar 1.0 MPI/ }),
      ).not.toBeInTheDocument();
    });
  });

  it("renders invalid highlight state when marked invalid", () => {
    const { container } = render(
      <SimulationFipeResolver
        fipeCode=""
        invalid={true}
        modelYear=""
        onFipeCodeChange={vi.fn()}
        onResolve={vi.fn()}
        onSelect={vi.fn()}
        selected={null}
      />,
    );

    expect(container.querySelector("section")).toHaveAttribute(
      "data-invalid",
      "true",
    );
    expect(
      screen.getByText("Confirme a versão FIPE/Molicar"),
    ).toBeInTheDocument();
  });
});
