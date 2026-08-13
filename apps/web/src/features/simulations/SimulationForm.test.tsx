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

  it("renders empty currency fields as blank and enables usable banks", async () => {
    const user = userEvent.setup();
    const { container } = renderForm();

    await user.click(screen.getByRole("button", { name: "Condições" }));
    expect(screen.getByLabelText("Valor do veículo (R$)")).toHaveValue("");
    expect(screen.getByLabelText("Entrada (R$)")).toHaveValue("");
    await user.click(screen.getByRole("button", { name: "Proponente" }));
    expect(screen.getByLabelText("Renda mensal (R$, opcional)")).toHaveValue(
      "",
    );
    await user.click(screen.getByRole("button", { name: "Revisão" }));
    expect(screen.getByRole("checkbox", { name: "BV" })).toBeChecked();
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
      fipeCode: "005340-6",
      licensingCity: "Sao Paulo",
      licensingUf: "sp",
      manufactureYear: 2022,
      modelYear: 2023,
      molicarCode: "01906108-0",
      phone: "+55 (11) 98765-4321",
      vehicleValueCents: 5_000_000,
    });

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
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      applicant: {
        cpfCnpj: "529.982.247-25",
        name: "Ana Souza",
        phone: "(11) 98765-4321",
      },
      downPaymentCents: 1_000_000,
      vehicle: {
        credereVehicleModelId: "credere_model_1",
        fipeCode: "005340-6",
        licensingCity: "São Paulo",
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

  it("shows only supported applicant fields requested by the preflight", async () => {
    const user = userEvent.setup();
    renderForm(vi.fn(), { cpfCnpj: "52998224725" }, async () => ({
      applicant: null,
      applicantKnown: true,
      missingFields: ["birthdate", "has_cnh", "unsupported_provider_field"],
      requirements: {},
    }));

    await user.click(screen.getByRole("button", { name: "Proponente" }));
    await user.click(screen.getByRole("button", { name: "Conferir agora" }));

    expect(
      await screen.findByRole("button", { name: /^Data de nascimento:/ }),
    ).toBeVisible();
    expect(screen.getByLabelText("Possui CNH")).toBeVisible();
    expect(screen.getByText(/esta tela ainda não envia/)).toBeVisible();
    expect(screen.queryByLabelText("unsupported_provider_field")).toBeNull();
  });

  it("hydrates empty applicant fields without replacing operator values", async () => {
    const user = userEvent.setup();
    renderForm(
      vi.fn(),
      {
        applicantName: "Nome informado pela loja",
        cpfCnpj: "52998224725",
        email: "operador@example.com",
        phone: "11988887777",
      },
      async () => ({
        applicant: {
          birthDate: "1990-05-10",
          email: "credere@example.com",
          hasCnh: true,
          monthlyIncomeCents: 450_000,
          name: "Nome retornado pela Credere",
          phone: "11999990000",
        },
        applicantKnown: true,
        missingFields: ["monthly_income"],
        requirements: {},
      }),
    );

    await user.click(screen.getByRole("button", { name: "Proponente" }));
    await user.click(screen.getByRole("button", { name: "Conferir agora" }));
    await screen.findByText(/Dados mínimos conferidos/);

    expect(screen.getByLabelText("Nome do proponente")).toHaveValue(
      "Nome informado pela loja",
    );
    expect(screen.getByLabelText("Telefone")).toHaveValue("(11) 98888-7777");
    expect(screen.getByLabelText(/^E-mail/)).toHaveValue(
      "operador@example.com",
    );
    expect(screen.getByLabelText(/^Renda mensal/)).toHaveValue("4.500,00");
  });
});

function renderForm(
  onSubmit: (draft: CredereSimulationDraft) => void = vi.fn(),
  prefill: ComponentProps<typeof SimulationForm>["prefill"] = undefined,
  onGetRequiredFields: ComponentProps<
    typeof SimulationForm
  >["onGetRequiredFields"] = async () => ({
    applicant: null,
    applicantKnown: false,
    missingFields: [],
    requirements: {},
  }),
) {
  return render(
    <SimulationForm
      banks={[{ code: "655", name: "BV", status: "okay" }]}
      isSubmitting={false}
      onGetRequiredFields={onGetRequiredFields}
      onResolveFipe={vi.fn(async () => ({
        candidates: [] as [],
        status: "not_found" as const,
      }))}
      onSubmit={onSubmit}
      {...(prefill ? { prefill } : {})}
      submitError={null}
    />,
  );
}
