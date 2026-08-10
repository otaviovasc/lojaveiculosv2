// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PublicStorefront } from "../PublicStorefront";
import { publicStorefrontPreview } from "../fixtures";
import type { PublicStorefrontPageData } from "../types";

vi.stubGlobal(
  "IntersectionObserver",
  class {
    disconnect() {}
    observe() {}
    unobserve() {}
  },
);

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  document.documentElement.style.removeProperty("--tenant-header-height");
});

describe("PublicStorefront QUADRA renderer", () => {
  it("renders every listing on the landing page and opens a card", () => {
    const onOpenListing = vi.fn();
    renderStorefront(quadraData(), onOpenListing);

    expect(
      screen.getByRole("button", {
        name: "Abrir detalhes de Fiat Toro Volcano 2023",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Abrir detalhes de Jeep Renegade Longitude 2022",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Abrir detalhes de Hyundai HB20 Comfort 2021",
      }),
    ).toBeInTheDocument();
    expect(document.querySelector('[href="/ofertas"]')).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Abrir detalhes de Fiat Toro Volcano 2023",
      }),
    );
    expect(onOpenListing).toHaveBeenCalledWith("fiat-toro-2023");
  });

  it("translates vehicle fuel labels before rendering cards", () => {
    const data = quadraData();
    const listing = data.listings[0];
    if (!listing) throw new Error("fixture must include a listing");
    listing.fuelType = "gasoline";

    renderStorefront(data, vi.fn());

    expect(screen.getByText("Gasolina")).toBeInTheDocument();
    expect(screen.queryByText("gasoline")).not.toBeInTheDocument();
  });

  it("keeps all landing-page stock visible and multi-photo navigation local", () => {
    const onOpenListing = vi.fn();
    const data = quadraData();
    const firstListing = data.listings[0];
    if (!firstListing) throw new Error("fixture must include a listing");
    firstListing.media = [
      media("https://cdn.test/front.jpg", 0),
      media("https://cdn.test/rear.jpg", 1),
    ];
    renderStorefront(data, onOpenListing);

    const image = screen
      .getAllByAltText("Fiat Toro Volcano 2023")
      .find((candidate) => candidate.getAttribute("loading") === "lazy");
    if (!image) throw new Error("vehicle card image must render");
    expect(image).toHaveAttribute("src", "https://cdn.test/front.jpg");
    expect(image).toHaveAttribute("loading", "lazy");
    fireEvent.click(
      screen.getByRole("button", {
        name: "Próxima foto de Fiat Toro Volcano 2023",
      }),
    );
    expect(image).toHaveAttribute("src", "https://cdn.test/rear.jpg");
    expect(onOpenListing).not.toHaveBeenCalled();

    expect(
      screen.getByRole("button", {
        name: "Abrir detalhes de Fiat Toro Volcano 2023",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Abrir detalhes de Jeep Renegade Longitude 2022",
      }),
    ).toBeInTheDocument();
  });

  it("does not reinsert explicitly hidden stock", () => {
    const data = quadraData();
    data.settings.site.theme = {
      ...data.settings.site.theme,
      sections: [
        section("hero", "hero", true, 0),
        section("featured", "stock-hidden", false, 1),
        section("about", "about", true, 2),
        section("contact", "contact", true, 3),
      ],
    };

    renderStorefront(data, vi.fn());

    expect(document.querySelectorAll("#cars")).toHaveLength(0);
    expect(
      screen.queryByRole("button", {
        name: "Abrir detalhes de Fiat Toro Volcano 2023",
      }),
    ).not.toBeInTheDocument();
  });

  it("deduplicates visible stock sections and their DOM id", () => {
    const data = quadraData();
    data.settings.site.theme = {
      ...data.settings.site.theme,
      sections: [
        section("hero", "hero", true, 0),
        section("featured", "stock-featured", true, 1),
        section("search", "stock-search", true, 2),
        section("about", "about", true, 3),
        section("contact", "contact", true, 4),
      ],
    };

    renderStorefront(data, vi.fn());

    expect(document.querySelectorAll("#cars")).toHaveLength(1);
    expect(
      screen.getAllByRole("button", {
        name: "Abrir detalhes de Fiat Toro Volcano 2023",
      }),
    ).toHaveLength(1);
  });

  it("inserts configured testimonials after stock for legacy section lists", () => {
    const data = quadraData();
    data.settings.site.theme = {
      ...data.settings.site.theme,
      testimonials: [
        {
          id: "review-1",
          name: "Maria",
          quote: "Atendimento excelente",
          role: "Cliente",
        },
      ],
    };

    renderStorefront(data, vi.fn());

    const stock = document.getElementById("cars");
    const testimonials = document.getElementById("depoimentos");
    if (!stock || !testimonials) {
      throw new Error("stock and testimonials sections must render");
    }
    expect(
      stock.compareDocumentPosition(testimonials) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen.getByText("Atendimento excelente", { exact: false }),
    ).toBeInTheDocument();
  });

  it("runs the responsive testimonial carousel and pauses autoplay during interaction", async () => {
    vi.useFakeTimers();
    setViewportWidth(375);
    const longTitle =
      "Uma experiência excelente e segura do início ao fim!".repeat(2);
    const longQuote =
      "A equipe foi atenciosa, transparente e encontrou exatamente o veículo que eu procurava. ".repeat(
        3,
      );
    const data = quadraData();
    data.settings.site.theme = {
      ...data.settings.site.theme,
      testimonials: Array.from({ length: 4 }, (_, index) => ({
        id: `review-${index + 1}`,
        name: index === 0 ? longTitle : `Cliente ${index + 1}`,
        quote: index === 0 ? longQuote : `Depoimento ${index + 1}`,
      })),
    };

    renderStorefront(data, vi.fn());

    const slider = document.querySelector(".quadra-testimonials__slider");
    if (!slider) throw new Error("testimonial slider must render");
    expect(
      screen.getAllByRole("button", { name: /Mostrar depoimento/ }),
    ).toHaveLength(4);
    expect(screen.getByTitle(longTitle)).toHaveTextContent(
      `${longTitle.slice(0, 60)}...`,
    );
    expect(screen.getByTitle(longQuote.trim())).toHaveTextContent(
      `${longQuote.trim().slice(0, 160)}...`,
    );

    const firstDot = screen.getByRole("button", {
      name: "Mostrar depoimento 1",
    });
    expect(firstDot).toHaveAttribute("aria-current", "true");

    fireEvent.mouseEnter(slider);
    await act(async () => vi.advanceTimersByTime(10_000));
    expect(firstDot).toHaveAttribute("aria-current", "true");

    fireEvent.mouseLeave(slider);
    await act(async () => vi.advanceTimersByTime(5000));
    const secondDot = screen.getByRole("button", {
      name: "Mostrar depoimento 2",
    });
    expect(secondDot).toHaveAttribute("aria-current", "true");

    fireEvent.focus(secondDot);
    await act(async () => vi.advanceTimersByTime(10_000));
    expect(secondDot).toHaveAttribute("aria-current", "true");

    setViewportWidth(1300);
    fireEvent(window, new Event("resize"));
    expect(
      screen.getAllByRole("button", { name: /Mostrar depoimento/ }),
    ).toHaveLength(2);
  });

  it("remeasures header height when the tenant logo loads", () => {
    const data = quadraData();
    data.settings.site.theme = {
      ...data.settings.site.theme,
      logoUrl: "https://cdn.test/logo.svg",
    };
    renderStorefront(data, vi.fn());
    const header = document.getElementById("header");
    if (!header) throw new Error("header must render");
    Object.defineProperty(header, "offsetHeight", { value: 88 });

    const logo = document.querySelector(".quadra-header__logo");
    if (!logo) throw new Error("header logo must render");
    fireEvent.load(logo);

    expect(
      document.documentElement.style.getPropertyValue("--tenant-header-height"),
    ).toBe("88px");
  });

  it("pauses banner autoplay during pointer interaction", async () => {
    vi.useFakeTimers();
    const data = quadraData();
    data.settings.site.theme = {
      ...data.settings.site.theme,
      heroBannerUrls: [
        "https://cdn.test/banner-1.jpg",
        "https://cdn.test/banner-2.jpg",
      ],
      hero_banner_autoplay: true,
      hero_banner_speed: 4000,
      heroMediaSource: "banners",
    };
    renderStorefront(data, vi.fn());
    const viewport = document.querySelector(".quadra-hero__stage");
    if (!viewport) throw new Error("hero viewport must render");

    fireEvent.mouseEnter(viewport);
    await act(async () => vi.advanceTimersByTime(8000));
    expect(screen.getByAltText("Banner promocional 1")).toHaveAttribute(
      "src",
      "https://cdn.test/banner-1.jpg",
    );
    await act(async () => fireEvent.mouseLeave(viewport));
    await act(async () => Promise.resolve());
    await act(async () => vi.advanceTimersByTime(4000));
    expect(screen.getByAltText("Banner promocional 2")).toHaveAttribute(
      "src",
      "https://cdn.test/banner-2.jpg",
    );

    const previousButton = screen.getByRole("button", {
      name: "Destaque anterior",
    });
    fireEvent.focus(previousButton);
    await act(async () => vi.advanceTimersByTime(4000));
    expect(screen.getByAltText("Banner promocional 2")).toBeInTheDocument();
  });

  it("does not replace the Aurora renderer", () => {
    const data = quadraData();
    data.settings.site.layoutKey = "aurora";
    renderStorefront(data, vi.fn());

    expect(
      document.querySelector('[data-preset="aurora"]'),
    ).toBeInTheDocument();
    expect(document.querySelector("[data-quadra-classic]")).toBeNull();
  });

  it("submits the V1 Modern landing-page lead form without a listing", async () => {
    const data = quadraData();
    data.settings.site.theme = {
      ...data.settings.site.theme,
      lead_form: { show_on_lp: true },
    };
    const onSubmitStorefrontInterest = vi.fn(async () => ({
      deduplicated: false,
      lead: { id: "lead-lp", source: "public_site" as const, status: "new" },
    }));
    renderStorefront(data, vi.fn(), onSubmitStorefrontInterest);

    fireEvent.change(screen.getByLabelText("Nome"), {
      target: { value: "Ana Cliente" },
    });
    fireEvent.change(screen.getByLabelText("Telefone"), {
      target: { value: "(11) 99999-9999" },
    });
    fireEvent.change(screen.getByLabelText("E-mail"), {
      target: { value: "ana@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Tenho interesse" }));

    await waitFor(() =>
      expect(onSubmitStorefrontInterest).toHaveBeenCalledWith(
        expect.objectContaining({
          buyerName: "Ana Cliente",
          buyerPhone: "11999999999",
          buyerEmail: "ana@example.com",
          message: "Olá, tenho interesse. Por favor entre em contato.",
          website: "",
        }),
      ),
    );
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Interesse enviado"),
    );
  });
});

function renderStorefront(
  data: PublicStorefrontPageData,
  onOpenListing: (slug: string) => void,
  onSubmitStorefrontInterest = vi.fn(),
) {
  return render(
    <PublicStorefront
      data={data}
      detail={{ isLoading: false, listingSlug: null }}
      onCloseListing={vi.fn()}
      onOpenListing={onOpenListing}
      onRetryListing={vi.fn()}
      onSubmitListingInterest={vi.fn()}
      onSubmitStorefrontInterest={onSubmitStorefrontInterest}
    />,
  );
}

function quadraData(): PublicStorefrontPageData {
  return structuredClone({
    ...publicStorefrontPreview,
    settings: {
      ...publicStorefrontPreview.settings,
      site: {
        ...publicStorefrontPreview.settings.site,
        layoutKey: "quadra",
        theme: {
          heroImageUrl: "https://cdn.test/hero.jpg",
          heroTitle: "Nossas **Ofertas**",
          sections: ["featured", "about", "contact"],
        },
      },
    },
  });
}

function media(url: string, displayOrder: number) {
  return {
    altText: "Fiat Toro Volcano 2023",
    displayOrder,
    kind: "photo" as const,
    unitColorName: null,
    unitId: "unit-1",
    url,
  };
}

function section(type: string, id: string, visible: boolean, order: number) {
  return { id, order, type, visible };
}

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });
}
