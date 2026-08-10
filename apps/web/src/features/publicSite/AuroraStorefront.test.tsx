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

  it("renders the complete Modern content contract with defaults", () => {
    const data = auroraData();

    renderStorefront(data);

    expect(
      screen.getByRole("img", {
        name: "Fachada e atendimento da Loja Demo Motors",
      }),
    ).toHaveAttribute("src", "/images/storefront/about-store.webp");
    expect(
      screen.getByRole("img", { name: "Showroom da Loja Demo Motors" }),
    ).toHaveAttribute("src", "/images/storefront/about-showroom.webp");
    expect(screen.getByText("Cliente satisfeito")).toBeInTheDocument();
    expect(
      screen.getByText("Configure seu mapa no Personalizar"),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("img", {
        name: "Veículo coberto aguardando novas fotos",
      }),
    ).toHaveLength(2);
    expect(
      screen.getByRole("navigation", { name: "Navegação do rodapé" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Falar com a loja" }),
    ).toHaveAttribute("href", expect.stringContaining("text="));
  });

  it("renders configured contact copy, additional phones and Google map", () => {
    const data = auroraData();
    data.settings.site.theme = {
      ...data.settings.site.theme,
      contact: {
        description1: "Atendimento personalizado para cada escolha.",
        description2: "Visite nosso showroom ou fale com a equipe.",
        mapEmbedUrl: "https://www.google.com/maps/embed?pb=storefront",
        phone2: "1133334444",
        phone2Label: "Veículos novos",
        phone3: "11988887777",
        phone3Label: "Pós-venda",
        showMap: true,
        title: "Vamos conversar",
      },
    };

    renderStorefront(data);

    expect(screen.getByText("Vamos conversar")).toBeInTheDocument();
    expect(screen.getByText("Veículos novos")).toBeInTheDocument();
    expect(screen.getByText("Pós-venda")).toBeInTheDocument();
    expect(
      screen.getByTitle("Localização de Loja Demo Motors"),
    ).toHaveAttribute("src", "https://www.google.com/maps/embed?pb=storefront");
  });

  it("renders the V1 Modern landing-page lead form when enabled", () => {
    const data = auroraData();
    data.settings.site.theme = {
      ...data.settings.site.theme,
      lead_form: { show_on_lp: true },
    };

    renderStorefront(data);

    expect(
      screen.getByRole("heading", { name: "Envie uma mensagem" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Tenho interesse" }),
    ).toBeInTheDocument();
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
      onSubmitStorefrontInterest={vi.fn()}
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
