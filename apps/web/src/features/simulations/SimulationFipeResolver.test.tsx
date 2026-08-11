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

  it("requires an explicit choice and confirms it server-side", async () => {
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

    await user.click(screen.getByRole("button", { name: "Consultar Credere" }));
    await user.click(
      await screen.findByRole("button", {
        name: /Selecionar 1.0 MPI, Molicar 01906108-0/,
      }),
    );

    await waitFor(() => expect(onSelect).toHaveBeenCalledWith(candidate));
    expect(onResolve).toHaveBeenNthCalledWith(2, {
      fipeCode: "005340-6",
      modelYear: 2023,
      selectedModelId: "model_1",
      selectedMolicarCode: "01906108-0",
    });
  });

  it("shows an explicit not-found state instead of guessing", async () => {
    const user = userEvent.setup();
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

    await user.click(screen.getByRole("button", { name: "Consultar Credere" }));
    expect(
      await screen.findByText(/não encontrou uma versão Molicar disponível/i),
    ).toBeInTheDocument();
  });
});
