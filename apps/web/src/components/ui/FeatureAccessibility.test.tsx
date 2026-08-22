// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Eye } from "lucide-react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeatureTabs } from "./FeatureControls";
import { FeatureActionButton, FeaturePageShell } from "./FeatureLayout";
import { FeatureAlert, FeatureLoadingState } from "./FeatureStates";
import { FeatureRowAction, FeatureRowActions } from "./FeatureTable";

afterEach(cleanup);

describe("shared feature accessibility", () => {
  it("announces loading states as busy polite status regions", () => {
    render(<FeatureLoadingState title="Carregando dados" />);

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status).toHaveAttribute("aria-live", "polite");
  });

  it("uses polite status semantics for non-blocking success feedback", () => {
    render(<FeatureAlert tone="success">Alterações salvas</FeatureAlert>);

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveAttribute("data-tone", "success");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps alert icons aligned with a grouped title and message", () => {
    render(
      <FeatureAlert
        icon={<span data-testid="notice-icon" />}
        title="Somente leitura"
        tone="info"
      >
        Permissão necessária.
      </FeatureAlert>,
    );

    expect(screen.getByRole("status")).toHaveClass("flex", "items-start");
    expect(screen.getByTestId("notice-icon").parentElement).toHaveClass(
      "feature-alert__icon",
    );
    expect(screen.getByText("Somente leitura").parentElement).toHaveClass(
      "feature-alert__content",
    );
  });

  it("keeps regular page variants on the shared content boundary", () => {
    const { rerender } = render(
      <FeaturePageShell variant="content">Conteúdo</FeaturePageShell>,
    );

    expect(screen.getByRole("main")).toHaveClass("content-frame");

    rerender(<FeaturePageShell variant="plain">Conteúdo</FeaturePageShell>);

    expect(screen.getByRole("main")).toHaveClass("content-frame");

    rerender(<FeaturePageShell>Conteúdo</FeaturePageShell>);

    expect(screen.getByRole("main")).toHaveClass("dashboard-main");
  });

  it("disables busy action buttons and exposes their state", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <FeatureActionButton isBusy label="Salvar" onClick={onClick}>
        Salvando
      </FeatureActionButton>,
    );

    const button = screen.getByRole("button", { name: "Salvar" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAttribute("aria-disabled", "true");
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("uses roving focus and arrow, home, and end keys for tabs", async () => {
    const user = userEvent.setup();
    render(<TabsHarness />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1, -1]);

    tabs[0]?.focus();
    await user.keyboard("{ArrowRight}");
    expect(tabs[1]).toHaveFocus();
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{End}");
    expect(tabs[2]).toHaveFocus();

    await user.keyboard("{Home}");
    expect(tabs[0]).toHaveFocus();
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
  });

  it("keeps compact row actions on the shared touch-target contract", () => {
    render(
      <FeatureRowActions>
        <FeatureRowAction
          ariaLabel="Visualizar documento"
          icon={Eye}
          onClick={vi.fn()}
          tooltip="Visualizar"
        />
      </FeatureRowActions>,
    );

    expect(
      screen.getByRole("button", { name: "Visualizar documento" }),
    ).toHaveClass("feature-row-action__button");
    expect(screen.getByRole("tooltip")).toHaveTextContent("Visualizar");
  });
});

function TabsHarness() {
  const [value, setValue] = useState("queue");
  return (
    <FeatureTabs
      ariaLabel="Etapas"
      onChange={setValue}
      options={[
        { label: "Fila", value: "queue" },
        { label: "Prévia", value: "preview" },
        { label: "Detalhes", value: "details" },
      ]}
      value={value}
    />
  );
}
