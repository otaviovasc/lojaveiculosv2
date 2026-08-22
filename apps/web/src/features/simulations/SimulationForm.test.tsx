// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SimulationForm } from "./SimulationForm";
import type { CredereSimulationDraft } from "./types";

vi.mock("../settings/apiClient", () => ({
  createSettingsApi: () => ({
    getStoreSettings: async () => ({
      profile: { addressState: null, addressCity: null },
    }),
  }),
}));

describe("SimulationForm", () => {
  afterEach(cleanup);

  it("does not let stepper navigation skip an incomplete vehicle", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Condições" }));
    expect(
      screen.getAllByText("Selecione o veículo e confirme os anos.")[0],
    ).toBeVisible();
    expect(screen.queryByLabelText("Entrada (R$)")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Veículo" })).toHaveAttribute(
      "aria-current",
      "step",
    );
  });

  it("shows real gender, occupation and CEP fields requested by selected banks", async () => {
    const user = userEvent.setup();
    renderForm(vi.fn(), validVehiclePrefill(), async () => ({
      applicant: null,
      applicantKnown: false,
      domains: {
        gender: [{ label: "Feminino", value: "F" }],
        occupation: [{ label: "Servidor público", value: "43" }],
      },
      missingFields: [
        "retrieve_gender",
        "retrieve_occupation",
        "address.zip_code",
      ],
      requirements: {},
    }));

    await user.click(screen.getByRole("button", { name: "Proponente" }));
    await user.type(screen.getByLabelText("Nome do proponente"), "Ana Souza");
    await user.type(screen.getByLabelText("CPF/CNPJ"), "52998224725");
    await user.type(screen.getByLabelText("Telefone"), "11987654321");
    expect(await screen.findByRole("button", { name: "Gênero" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Ocupação" })).toBeVisible();
    expect(screen.getByLabelText("CEP residencial")).toBeVisible();
  });

  it("blocks unknown required provider fields with an actionable message", async () => {
    const user = userEvent.setup();
    renderForm(vi.fn(), validVehiclePrefill(), async () => ({
      applicant: null,
      applicantKnown: true,
      domains: {},
      missingFields: ["lead.profession"],
      requirements: {},
    }));

    await user.click(screen.getByRole("button", { name: "Proponente" }));
    await user.type(screen.getByLabelText("Nome do proponente"), "Ana Souza");
    await user.type(screen.getByLabelText("CPF/CNPJ"), "52998224725");
    await user.type(screen.getByLabelText("Telefone"), "11987654321");
    expect(
      await screen.findByText(/a consulta exige campo.*profissão/i),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.queryByText("Condições")).toBeInTheDocument();
    expect(screen.queryByLabelText("Entrada (R$)")).toBeNull();
  });

  function validVehiclePrefill() {
    return {
      credereVehicleModelId: "credere_model_1",
      fipeCode: "005340-6",
      licensingCity: "Sao Paulo",
      licensingUf: "SP",
      manufactureYear: 2022,
      modelYear: 2023,
      molicarCode: "01906108-0",
      vehicleValueCents: 5_000_000,
    };
  }

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
    renderForm(
      vi.fn(),
      { ...validVehiclePrefill(), cpfCnpj: "52998224725" },
      async () => ({
        applicant: null,
        applicantKnown: true,
        domains: {},
        missingFields: ["birthdate", "has_cnh", "unsupported_provider_field"],
        requirements: {},
      }),
    );

    await user.click(screen.getByRole("button", { name: "Proponente" }));
    await user.click(screen.getByRole("button", { name: "Conferir agora" }));

    expect(
      await screen.findByRole("button", { name: /^Data de nascimento:/ }),
    ).toBeVisible();
    expect(
      screen.getByText(/a consulta exige campo.*unsupported provider field/i),
    ).toBeVisible();
    expect(screen.queryByLabelText("unsupported_provider_field")).toBeNull();
  });

  it("hydrates empty applicant fields without replacing operator values", async () => {
    const user = userEvent.setup();
    renderForm(
      vi.fn(),
      {
        ...validVehiclePrefill(),
        applicantName: "Nome informado pela loja",
        cpfCnpj: "52998224725",
        email: "operador@example.com",
        phone: "11988887777",
      },
      async () => ({
        applicant: {
          addressZipCode: null,
          birthDate: "1990-05-10",
          email: "credere@example.com",
          genderCode: null,
          hasCnh: true,
          monthlyIncomeCents: 450_000,
          name: "Nome retornado pela Credere",
          occupationCode: null,
          phone: "11999990000",
        },
        applicantKnown: true,
        domains: {},
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

  it("highlights missing required fields and cards when user clicks continue", async () => {
    const user = userEvent.setup();
    const { container } = renderForm();

    // On step "vehicle", fields are initially blank. Click "Continuar"
    await user.click(screen.getByRole("button", { name: "Continuar" }));

    // Required fields in vehicle step should be highlighted with data-invalid="true"
    expect(screen.getByPlaceholderText("Ex.: 2023")).toHaveAttribute(
      "data-invalid",
      "true",
    );
    expect(screen.getByPlaceholderText("Ex.: 2024")).toHaveAttribute(
      "data-invalid",
      "true",
    );
    expect(
      screen.getByRole("button", { name: "UF de licenciamento" }),
    ).toHaveAttribute("data-invalid", "true");
    expect(
      screen.getAllByText("Selecione o veículo e confirme os anos.")[0],
    ).toBeInTheDocument();
    expect(
      container.querySelector("section.credere-form-fipe"),
    ).toHaveAttribute("data-invalid", "true");
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
    domains: {},
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
