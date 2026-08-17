// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CrmPipelineSettingsLayout } from "./CrmPipelineSettingsLayout";
import type { Pipeline } from "./crmPipelineStorage";

describe("CrmPipelineSettingsLayout", () => {
  it("does not expose the unsupported pipeline routing editor", () => {
    render(
      <CrmPipelineSettingsLayout
        onBack={vi.fn()}
        onDeletePipeline={vi.fn()}
        onUpdatePipeline={vi.fn()}
        pipeline={pipeline}
      />,
    );

    expect(screen.getByRole("tab", { name: "Geral" })).toBeVisible();
    expect(
      screen.queryByRole("tab", { name: "Roteamento" }),
    ).not.toBeInTheDocument();
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
