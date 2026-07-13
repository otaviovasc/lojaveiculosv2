// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CrmPipelineSettingsRoteamento } from "./CrmPipelineSettingsRoteamento";
import type { Pipeline } from "./crmPipelineStorage";

afterEach(cleanup);

describe("CrmPipelineSettingsRoteamento", () => {
  it("creates a routing rule through the shared dialog", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(
      <CrmPipelineSettingsRoteamento onUpdate={onUpdate} pipeline={pipeline} />,
    );

    await user.click(screen.getByRole("button", { name: "Nova regra" }));
    expect(
      screen.getByRole("dialog", { name: "Nova regra de roteamento" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        routingRules: [
          expect.objectContaining({ origin: "public_site", storeId: "all" }),
        ],
      }),
    );
  });
});

const pipeline: Pipeline = {
  description: "",
  id: "sales",
  isDefault: true,
  name: "Vendas",
  rotationActive: false,
  routingRules: [],
  stages: [],
};
