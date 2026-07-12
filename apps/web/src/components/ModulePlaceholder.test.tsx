// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ModulePlaceholder } from "./ModulePlaceholder";

describe("ModulePlaceholder", () => {
  afterEach(cleanup);

  it("presents an honest roadmap state without an inert primary action", () => {
    render(
      <ModulePlaceholder
        module={{
          action: "Criar modelos",
          description: "Checklist operacional em preparação.",
          eyebrow: "Gestão",
          id: "checklists",
          title: "Checklists",
        }}
      />,
    );

    expect(screen.getByText("Em planejamento")).toBeVisible();
    expect(screen.getByText("Contrato visual definido")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Criar modelos" }),
    ).not.toBeInTheDocument();
  });
});
