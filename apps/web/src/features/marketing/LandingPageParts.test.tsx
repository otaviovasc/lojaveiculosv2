// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { HeroSection } from "./LandingHero";
import { ProductSection } from "./LandingProduct";
import {
  FeatureSection,
  FinalCta,
  LandingFooter,
  MetricsSection,
  ProblemSection,
  TestimonialsSection,
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

vi.mock("../../components/ui/AnimatedContent", () => ({
  default: ({ children }: { children: unknown }) => children,
}));

describe("public landing copy", () => {
  afterEach(cleanup);

  it("uses customer-facing Portuguese without provider terminology", () => {
    render(
      <MemoryRouter>
        <HeroSection />
        <MetricsSection />
        <ProblemSection />
        <WorkflowSection />
        <ProductSection />
        <FeatureSection />
        <TestimonialsSection />
        <FinalCta />
        <LandingFooter />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "O sistema que faz você vender até 10 carros a mais por mês.",
      }),
    ).toBeVisible();
    expect(screen.getByText("SaaS para lojas de veículos")).toBeVisible();
    expect(screen.getByText("Produtividade real")).toBeVisible();
    expect(screen.getByText("O status quo do mercado")).toBeVisible();
    expect(screen.getByText("Burocracia fiscal manual")).toBeVisible();
    expect(screen.getByText("Como funciona o motor")).toBeVisible();
    expect(screen.getByText("Estoque")).toBeVisible();
    expect(screen.getByText("Auditoria e permissões")).toBeVisible();
    expect(screen.getByText("Ofertas Sobre Rodas")).toBeVisible();
    expect(document.body).not.toHaveTextContent("Clerk");
    expect(document.body).not.toHaveTextContent("tenant");
  });

  it("renders a product preview image instead of a background video", () => {
    const { container } = render(
      <MemoryRouter>
        <ProductSection />
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
