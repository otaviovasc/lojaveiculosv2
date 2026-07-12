// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeatureTabs } from "./FeatureControls";
import { FeatureActionButton } from "./FeatureLayout";
import { FeatureAlert, FeatureLoadingState } from "./FeatureStates";

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
