// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { publicStorefrontPreview } from "../fixtures";
import type { PublicStorefrontPageData } from "../types";
import { adaptQuadraStorefront } from "./quadraAdapter";
import { QuadraHero } from "./QuadraHero";

afterEach(cleanup);

describe("QuadraHero V1 Modern banner parity", () => {
  it("uses the mobile banner responsively and keeps its CTA on LP inventory", () => {
    const model = adaptQuadraStorefront(
      withTheme({
        heroBannerButtonText: "Conferir estoque",
        heroBannerMobileUrl: "https://cdn.test/mobile.jpg",
        heroBannerMode: true,
        heroBannerShowButton: true,
        heroBannerShowText: false,
        heroBannerUrls: ["https://cdn.test/desktop.jpg"],
        heroMediaSource: "banners",
        heroTitle: "Título que deve ficar oculto",
      }),
    );

    const { container } = render(
      <QuadraHero model={model} onOpenListing={vi.fn()} />,
    );

    expect(container.querySelector("picture source")).toHaveAttribute(
      "media",
      "(max-width: 767px)",
    );
    expect(container.querySelector("picture source")).toHaveAttribute(
      "srcset",
      "https://cdn.test/mobile.jpg",
    );
    expect(screen.getByAltText("Banner promocional 1")).toHaveAttribute(
      "src",
      "https://cdn.test/desktop.jpg",
    );
    expect(
      screen.queryByText("Título que deve ficar oculto"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Conferir estoque" }),
    ).toHaveAttribute("href", "#cars");
    expect(container.querySelector('[href="/ofertas"]')).toBeNull();
  });

  it("keeps vehicle mode opening the active listing", () => {
    const onOpenListing = vi.fn();
    const model = adaptQuadraStorefront(
      withTheme({
        banner_mode: true,
        hero_banners: ["https://cdn.test/banner.jpg"],
        heroMediaSource: "vehicles",
      }),
    );

    render(<QuadraHero model={model} onOpenListing={onOpenListing} />);
    fireEvent.click(screen.getByRole("button", { name: "Ver veículo" }));

    expect(onOpenListing).toHaveBeenCalledWith(
      publicStorefrontPreview.listings[0]?.slug,
    );
  });
});

function withTheme(theme: Record<string, unknown>): PublicStorefrontPageData {
  return {
    ...publicStorefrontPreview,
    settings: {
      ...publicStorefrontPreview.settings,
      site: {
        ...publicStorefrontPreview.settings.site,
        heroImageUrl: null,
        layoutKey: "quadra",
        seoDescription: null,
        theme,
      },
    },
  };
}
