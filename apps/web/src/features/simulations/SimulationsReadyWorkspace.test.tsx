// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SimulationsReadyWorkspace } from "./SimulationsReadyWorkspace";

describe("SimulationsReadyWorkspace", () => {
  afterEach(cleanup);

  it("does not announce success when simulation creation rejects", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => {
      throw new Error("Credere unavailable");
    });
    render(
      <SimulationsReadyWorkspace
        current={null}
        history={[]}
        historyError={null}
        isRefreshing={false}
        isSubmitting={false}
        onGetRequiredFields={async () => ({
          applicant: null,
          applicantKnown: false,
          domains: {},
          missingFields: [],
          requirements: {},
        })}
        onRefresh={vi.fn()}
        onResolveFipe={vi.fn(async () => ({
          candidates: [] as [],
          status: "not_found" as const,
        }))}
        onRetryHistory={vi.fn()}
        onSelectSimulation={vi.fn()}
        onSubmit={onSubmit}
        pollError={null}
        pollExhausted={false}
        prefill={{
          applicantName: "Ana Souza",
          cpfCnpj: "52998224725",
          credereVehicleModelId: "credere_model_1",
          fipeCode: "005340-6",
          licensingCity: "São Paulo",
          licensingUf: "SP",
          manufactureYear: 2022,
          modelYear: 2023,
          molicarCode: "01906108-0",
          phone: "11987654321",
          vehicleValueCents: 5_000_000,
        }}
        status={{
          configured: true,
          mappedStoreAlias: "Credere Centro",
          unavailableBanks: [],
          usableBanks: [{ code: "655", name: "BV", status: "okay" }],
        }}
        submitError={null}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Proponente" }));
    await user.click(screen.getByRole("button", { name: "Conferir agora" }));
    await screen.findByText(/Dados mínimos conferidos/);
    await user.click(screen.getByRole("button", { name: "Condições" }));
    await user.type(screen.getByLabelText("Entrada (R$)"), "1000000");
    await user.click(screen.getByRole("button", { name: "Revisão" }));
    await user.click(screen.getByLabelText(/O proponente autorizou/i));
    await user.click(
      screen.getByRole("button", { name: "Simular no Credere" }),
    );

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(screen.queryByText("Simulação registrada")).not.toBeInTheDocument();
  });
});
