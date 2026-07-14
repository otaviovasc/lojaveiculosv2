// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CommissionPanel } from "./SaleServicesCommissionPanel";
import { DocumentationPanel } from "./SaleServicesDocumentationPanel";
import { FinancingPanel, InsurancePanel } from "./SaleServicesPolicyPanels";
import type { ServiceChangeHandler } from "./SaleServicesTypes";
import type { SnapshotRecord } from "./salesSnapshot";

afterEach(cleanup);

type PercentagePanelKind = "commission" | "financing" | "insurance";

function ControlledPercentagePanel({
  kind,
  onChange,
}: {
  kind: PercentagePanelKind;
  onChange: ServiceChangeHandler;
}) {
  const [snapshot, setSnapshot] = useState<SnapshotRecord>(() =>
    kind === "commission"
      ? { enabled: true, ruleType: "percentage" }
      : kind === "financing"
        ? { rank: "R1" }
        : {},
  );
  const handleChange: ServiceChangeHandler = (section, field, value) => {
    onChange(section, field, value);
    setSnapshot((current) => ({ ...current, [field]: value }));
  };

  switch (kind) {
    case "commission":
      return <CommissionPanel commission={snapshot} onChange={handleChange} />;
    case "financing":
      return <FinancingPanel financing={snapshot} onChange={handleChange} />;
    case "insurance":
      return <InsurancePanel insurance={snapshot} onChange={handleChange} />;
  }
}

describe("sale service policy panels", () => {
  it.each([
    {
      field: "percentageRate",
      kind: "commission",
      label: "Valor da Comissão (R$ / %)",
      section: "commission",
    },
    {
      field: "interestRatePercentage",
      kind: "financing",
      label: "Taxa de Juros A.M. (%)",
      section: "financing",
    },
    {
      field: "appliedCommissionPercentage",
      kind: "insurance",
      label: "Comissão Aplicada sobre o Prêmio (%)",
      section: "insurance",
    },
  ] as const)(
    "preserves raw decimal typing in the $kind percentage field",
    async ({ field, kind, label, section }) => {
      const onChange = vi.fn<ServiceChangeHandler>();
      const user = userEvent.setup();
      render(<ControlledPercentagePanel kind={kind} onChange={onChange} />);
      const input = screen.getByLabelText(label);

      await user.clear(input);
      await user.type(input, "1,");
      expect(input).toHaveValue("1,");

      await user.type(input, "49");
      expect(input).toHaveValue("1,49");
      expect(onChange).toHaveBeenLastCalledWith(section, field, 1.49);
    },
  );

  it("records the V1 financing rank and normalized monthly rate", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <FinancingPanel
        financing={{ interestRatePercentage: 1.49, rank: "R1" }}
        onChange={onChange}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Classificação do financiamento" }),
    );
    await user.click(screen.getByRole("option", { name: "R4" }));
    fireEvent.change(screen.getByLabelText("Taxa de Juros A.M. (%)"), {
      target: { value: "1,75" },
    });

    expect(onChange).toHaveBeenCalledWith("financing", "rank", "R4");
    expect(onChange).toHaveBeenCalledWith(
      "financing",
      "interestRatePercentage",
      1.75,
    );
  });

  it("accepts the applied insurance commission with a decimal comma", () => {
    const onChange = vi.fn();
    const { container } = render(
      <InsurancePanel
        insurance={{ appliedCommissionPercentage: 10 }}
        onChange={onChange}
      />,
    );

    fireEvent.change(
      screen.getByLabelText("Comissão Aplicada sobre o Prêmio (%)"),
      { target: { value: "12,5" } },
    );

    expect(onChange).toHaveBeenCalledWith(
      "insurance",
      "appliedCommissionPercentage",
      12.5,
    );
    expect(container.querySelector("select")).not.toBeInTheDocument();
  });

  it("captures documentation amount and lien as typed facts", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <DocumentationPanel
        documentation={{ hasLien: null, status: "pending" }}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText("Valor Cobrado do Cliente"), {
      target: { value: "750,00" },
    });
    await user.click(
      screen.getByRole("button", {
        name: "Alienação fiduciária da documentação",
      }),
    );
    await user.click(screen.getByRole("option", { name: "Com alienação" }));

    expect(onChange).toHaveBeenCalledWith(
      "documentation",
      "chargedAmountCents",
      75_000,
    );
    expect(onChange).toHaveBeenCalledWith("documentation", "hasLien", true);
  });

  it("only submits an explicit, enabled sale commission override", () => {
    const disabledChange = vi.fn();
    const { rerender } = render(
      <CommissionPanel
        commission={{ enabled: false, ruleType: "percentage" }}
        onChange={disabledChange}
      />,
    );

    expect(screen.getByLabelText("Valor da Comissão (R$ / %)")).toBeDisabled();
    fireEvent.click(
      screen.getByRole("switch", { name: "Calcular comissão nesta venda" }),
    );
    expect(disabledChange).toHaveBeenCalledWith("commission", "enabled", true);

    const enabledChange = vi.fn();
    rerender(
      <CommissionPanel
        commission={{ enabled: true, ruleType: "percentage" }}
        onChange={enabledChange}
      />,
    );
    fireEvent.change(screen.getByLabelText("Valor da Comissão (R$ / %)"), {
      target: { value: "1,5" },
    });

    expect(enabledChange).toHaveBeenCalledWith(
      "commission",
      "percentageRate",
      1.5,
    );
  });
});
