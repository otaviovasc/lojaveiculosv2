// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PublicStorefront } from "./PublicStorefront";
import { publicStorefrontPreview } from "./fixtures";
import type { PublicStorefrontPageData } from "./types";

vi.stubGlobal(
  "IntersectionObserver",
  class {
    disconnect() {}
    observe() {}
    unobserve() {}
  },
);

afterEach(cleanup);

describe("PublicStorefront Aurora landing inventory", () => {
  it("renders every supplied listing and has no ofertas-page link", () => {
    const data = auroraData();
    data.listings = createListings(12);

    renderStorefront(data);

    expect(
      screen.getAllByRole("button", { name: /Abrir detalhes de Veículo/ }),
    ).toHaveLength(12);
    expect(screen.getByText("Mostrando 12 veículos")).toBeInTheDocument();
    expect(document.querySelector('a[href*="/ofertas"]')).toBeNull();
  });

  it("adds the complete landing stock when legacy sections omit it", () => {
    const data = auroraData();
    data.listings = createListings(9);
    data.settings.site.theme = {
      ...data.settings.site.theme,
      sections: ["about", "contact"],
    };

    renderStorefront(data);

    expect(document.querySelector("#estoque")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /Abrir detalhes de Veículo/ }),
    ).toHaveLength(9);
  });
});

function renderStorefront(data: PublicStorefrontPageData) {
  return render(
    <PublicStorefront
      data={data}
      detail={{ isLoading: false, listingSlug: null }}
      onCloseListing={vi.fn()}
      onOpenListing={vi.fn()}
      onRetryListing={vi.fn()}
      onSubmitListingInterest={vi.fn()}
    />,
  );
}

function auroraData(): PublicStorefrontPageData {
  const data = structuredClone(publicStorefrontPreview);
  data.settings.site.layoutKey = "aurora";
  data.settings.site.theme = {
    ...data.settings.site.theme,
    sections: undefined,
  };
  return data;
}

function createListings(count: number) {
  const template = publicStorefrontPreview.listings[0];
  if (!template) throw new Error("fixture must include a listing");
  return Array.from({ length: count }, (_, index) => ({
    ...structuredClone(template),
    slug: `veiculo-${index + 1}`,
    title: `Veículo ${index + 1}`,
  }));
}
