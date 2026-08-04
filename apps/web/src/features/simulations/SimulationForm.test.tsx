// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SimulationForm } from "./SimulationForm";
import type { CredereSimulationDraft } from "./types";

describe("SimulationForm", () => {
  afterEach(cleanup);

  it("renders empty currency fields as blank and uses custom selects", () => {
    const { container } = renderForm();

    expect(screen.getByLabelText("Valor do veículo (R$)")).toHaveValue("");
    expect(screen.getByLabelText("Entrada (R$)")).toHaveValue("");
    expect(screen.getByLabelText("Renda mensal (R$, opcional)")).toHaveValue(
      "",
    );
    expect(container.querySelector("select")).toBeNull();
    expect(container.querySelector("option")).toBeNull();
  });

  it("submits prefilled client and selected Credere vehicle data", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(draft: CredereSimulationDraft) => void>();
    renderForm(onSubmit, {
      applicantName: "Ana Souza",
      cpfCnpj: "52998224725",
      credereVehicleModelId: "credere_model_1",
      licensingCity: "Sao Paulo",
      licensingUf: "sp",
      manufactureYear: 2022,
      modelYear: 2023,
      molicarCode: "01906108-0",
      phone: "+55 (11) 98765-4321",
      vehicleValueCents: 5_000_000,
    });

    await user.type(screen.getByLabelText("Entrada (R$)"), "1000000");
    await user.click(screen.getByLabelText(/O proponente autorizou/i));
    await user.click(
      screen.getByRole("button", { name: "Simular no Credere" }),
    );

    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      applicant: {
        cpfCnpj: "529.982.247-25",
        name: "Ana Souza",
        phone: "(11) 98765-4321",
      },
      downPaymentCents: 1_000_000,
      vehicle: {
        credereVehicleModelId: "credere_model_1",
        licensingCity: "Sao Paulo",
        licensingUf: "SP",
        manufactureYear: 2022,
        modelYear: 2023,
        molicarCode: "01906108-0",
        priceCents: 5_000_000,
      },
    });
    const submitted = onSubmit.mock.calls[0]?.[0];
    expect(submitted?.applicant).not.toHaveProperty("monthlyIncomeCents");
  });
});

function renderForm(
  onSubmit: (draft: CredereSimulationDraft) => void = vi.fn(),
  prefill: ComponentProps<typeof SimulationForm>["prefill"] = undefined,
) {
  return render(
    <SimulationForm
      banks={[{ code: "655", name: "BV", status: "okay" }]}
      isSubmitting={false}
      onSubmit={onSubmit}
      {...(prefill ? { prefill } : {})}
      submitError={null}
    />,
  );
}
