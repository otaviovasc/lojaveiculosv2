// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import {
  FeatureSection,
  FinalCta,
  HeroSection,
  OutcomeStrip,
  WorkflowSection,
} from "./LandingPageParts";

vi.mock("./LandingAuthActions", () => ({
  LandingAuthActions: ({ primaryLabel }: { primaryLabel: string }) => (
    <button type="button">{primaryLabel}</button>
  ),
}));

vi.mock("./LandingHeroShader", () => ({
  LandingHeroShader: () => <div data-testid="hero-shader" />,
}));

describe("public landing copy", () => {
  afterEach(cleanup);

  it("uses customer-facing Portuguese without provider terminology", () => {
    render(
      <MemoryRouter>
        <HeroSection />
        <OutcomeStrip />
        <WorkflowSection />
        <FeatureSection />
        <FinalCta />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Loja Veículos" }),
    ).toBeVisible();
    expect(screen.getByText("SaaS para lojas de veículos")).toBeVisible();
    expect(screen.getByText("Operação auditada")).toBeVisible();
    expect(
      screen.getByText("Vitrine pública com domínio, páginas e SEO."),
    ).toBeVisible();
    expect(screen.getByText("Inventário")).toBeVisible();
    expect(screen.getByText("Gestão")).toBeVisible();
    expect(document.body).not.toHaveTextContent("Clerk");
    expect(document.body).not.toHaveTextContent("tenant");
  });
});
