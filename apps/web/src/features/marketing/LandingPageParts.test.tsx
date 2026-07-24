// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { HeroSection } from "./LandingHero";
import {
  FeatureSection,
  FinalCta,
  LandingFooter,
  OutcomeStrip,
  ProblemSection,
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
        <ProblemSection />
        <WorkflowSection />
        <FeatureSection />
        <FinalCta />
        <LandingFooter />
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
    expect(screen.getByText("O status quo do mercado")).toBeVisible();
    expect(screen.getByText("Burocracia fiscal manual")).toBeVisible();
    expect(
      screen.getByText("Da entrada do pátio ao dinheiro no caixa."),
    ).toBeVisible();
    expect(screen.getByText("Inventário")).toBeVisible();
    expect(screen.getByText("Gestão")).toBeVisible();
    expect(document.body).not.toHaveTextContent("Clerk");
    expect(document.body).not.toHaveTextContent("tenant");
  });

  it("renders a product preview image instead of a background video", () => {
    const { container } = render(
      <MemoryRouter>
        <HeroSection />
      </MemoryRouter>,
    );

    expect(container.querySelector("video")).not.toBeInTheDocument();
    expect(
      screen.getByAltText(
        "Painel de estoque da Loja Veículos com veículos, status e ações operacionais",
      ),
    ).toBeVisible();
  });
});
