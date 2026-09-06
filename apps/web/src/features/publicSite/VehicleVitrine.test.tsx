// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import {
  defaultStorefrontBuilderConfig,
  type StorefrontBuilderComponent,
} from "@lojaveiculosv2/shared";
import { PageBuilderRenderer } from "./PageBuilderRenderer";
import { GalleryBlock, TestimonialsBlock } from "./PageBuilderMediaBlocks";
import {
  VehicleVitrineHero,
  VehicleVitrineImage,
} from "./VehicleVitrineComponents";
import { extractCommercialCondition } from "./vehicleVitrineContent";
import type { BuilderRenderContext } from "./pageBuilderRenderTypes";

const hero: StorefrontBuilderComponent = {
  id: "hero",
  type: "hero",
  order: 0,
  visible: true,
  props: {
    pageVariant: "vehicle-vitrine",
    title: "Audi A4",
    subtitle: "Condição comercial sob consulta · 32.000 km",
    price: "R$ 999.999",
    imageUrl: "https://example.com/audi.jpg",
  },
};
const gallery: StorefrontBuilderComponent = {
  id: "gallery",
  type: "gallery",
  order: 2,
  visible: true,
  props: {
    images: [
      {
        id: "front",
        url: "https://example.com/front.jpg",
        alt: "Frente do veículo",
      },
      {
        id: "rear",
        url: "https://example.com/rear.jpg",
        alt: "Traseira do veículo",
      },
    ],
  },
};
const contact: StorefrontBuilderComponent = {
  id: "contact",
  type: "contact_section",
  order: 3,
  visible: true,
  props: {},
};
const specs: StorefrontBuilderComponent = {
  id: "specs",
  type: "vehicle_specs",
  order: 1,
  visible: true,
  props: { specs: { Ano: "2022" } },
};
const context: BuilderRenderContext = {
  accent: defaultStorefrontBuilderConfig.accentColor,
  allComponents: [hero, specs, gallery, contact],
  config: defaultStorefrontBuilderConfig,
  pageSlug: "vitrine-audi",
  preview: false,
  renderBlocks: () => null,
  vehicles: [],
};
const page = {
  id: "page",
  title: "Audi A4",
  slug: "vitrine-audi",
  order: 0,
  visible: true,
  components: [hero, specs, gallery, contact],
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("emphasizes only the complete public condition and preserves all remaining copy", () => {
  expect(
    extractCommercialCondition(
      "R$ 189.900 · 32.000 km · Gasolina. Conheça os detalhes.",
    ),
  ).toEqual({
    commercialCondition: "R$ 189.900",
    description: "32.000 km · Gasolina. Conheça os detalhes.",
  });
  expect(
    extractCommercialCondition("Condição comercial sob consulta · Automático"),
  ).toEqual({
    commercialCondition: "Condição comercial sob consulta",
    description: "Automático",
  });
  expect(
    extractCommercialCondition("R$ 189.900 de referência, consulte condições"),
  ).toEqual({
    commercialCondition: null,
    description: "R$ 189.900 de referência, consulte condições",
  });
});

it("never overrides the public consultation condition with stored price props", () => {
  render(<VehicleVitrineHero component={hero} context={context} />);
  expect(screen.getByText("Condição comercial sob consulta")).toBeVisible();
  expect(screen.queryByText("R$ 999.999")).not.toBeInTheDocument();
  expect(
    screen.getByRole("heading", { level: 1, name: "Audi A4" }),
  ).toBeVisible();
  expect(
    screen.queryByText("Publicação pronta para conversão"),
  ).not.toBeInTheDocument();
  expect(screen.queryByText("Estoque revisado")).not.toBeInTheDocument();
});

it("omits section links when their blocks are hidden or absent", () => {
  render(
    <VehicleVitrineHero
      component={hero}
      context={{
        ...context,
        allComponents: [
          hero,
          { ...gallery, visible: false },
          { ...specs, visible: false },
        ],
      }}
    />,
  );
  expect(
    screen.queryByRole("link", { name: /Ver fotos/ }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: "Ficha técnica" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: "Falar com a loja" }),
  ).not.toBeInTheDocument();
});

it("recovers the image when its URL changes after a failed load", () => {
  const { rerender } = render(
    <VehicleVitrineImage alt="Audi" src="https://example.com/broken.jpg" />,
  );
  fireEvent.error(screen.getByRole("img", { name: "Audi" }));
  expect(screen.getByText("Foto indisponível")).toBeVisible();
  rerender(
    <VehicleVitrineImage alt="Audi" src="https://example.com/new.jpg" />,
  );
  expect(screen.getByRole("img", { name: "Audi" })).toHaveAttribute(
    "src",
    "https://example.com/new.jpg",
  );
});

it("shows the contact dock only for a public vitrine with a visible contact section", () => {
  const { rerender } = render(
    <PageBuilderRenderer config={defaultStorefrontBuilderConfig} page={page} />,
  );
  expect(screen.getByLabelText("Ações rápidas do veículo")).toHaveTextContent(
    "Condição comercial sob consulta",
  );
  rerender(
    <PageBuilderRenderer
      config={defaultStorefrontBuilderConfig}
      page={page}
      preview
    />,
  );
  expect(
    screen.queryByLabelText("Ações rápidas do veículo"),
  ).not.toBeInTheDocument();
  rerender(
    <PageBuilderRenderer
      config={defaultStorefrontBuilderConfig}
      page={{ ...page, components: [hero] }}
    />,
  );
  expect(
    screen.queryByLabelText("Ações rápidas do veículo"),
  ).not.toBeInTheDocument();
  rerender(
    <PageBuilderRenderer
      config={defaultStorefrontBuilderConfig}
      page={{ ...page, components: [{ ...hero, visible: false }, contact] }}
    />,
  );
  expect(
    screen.queryByLabelText("Ações rápidas do veículo"),
  ).not.toBeInTheDocument();
});

it("hides the dock while its contact target is visible", () => {
  let showContact = () => {};
  const disconnect = vi.fn();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
        showContact = () => callback([{ isIntersecting: true }]);
      }
      observe = vi.fn();
      disconnect = disconnect;
    },
  );
  render(
    <PageBuilderRenderer config={defaultStorefrontBuilderConfig} page={page} />,
  );
  expect(screen.getByLabelText("Ações rápidas do veículo")).toBeInTheDocument();
  act(() => showContact());
  expect(
    screen.queryByLabelText("Ações rápidas do veículo"),
  ).not.toBeInTheDocument();
});

it("supports gallery navigation, focus trapping, Escape and restoring trigger focus", async () => {
  const user = userEvent.setup();
  render(<GalleryBlock component={gallery} context={context} />);
  const trigger = screen.getByRole("button", { name: "Ver foto 1 de 2" });
  await user.click(trigger);
  const dialog = screen.getByRole("dialog", { name: "Fotos do veículo" });
  expect(within(dialog).getByText("Foto 1 de 2")).toBeVisible();
  await user.click(
    within(dialog).getByRole("button", { name: "Próxima foto" }),
  );
  expect(within(dialog).getByText("Foto 2 de 2")).toBeVisible();
  await user.keyboard("{ArrowLeft}");
  expect(within(dialog).getByText("Foto 1 de 2")).toBeVisible();
  for (let i = 0; i < 5; i++) {
    await user.tab();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  }
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});

it("does not expose nonfunctional gallery buttons when lightbox is disabled or previewing", () => {
  const { rerender } = render(
    <GalleryBlock
      component={{
        ...gallery,
        props: { ...gallery.props, lightboxEnabled: false },
      }}
      context={context}
    />,
  );
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  rerender(
    <GalleryBlock
      component={gallery}
      context={{ ...context, preview: true }}
    />,
  );
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

it("keeps generic testimonial headings independent from vitrine gallery labels", () => {
  render(
    <TestimonialsBlock
      component={{
        id: "testimonials",
        type: "testimonials",
        order: 0,
        visible: true,
        props: {
          title: "Clientes",
          testimonials: [{ quote: "Ótimo atendimento", name: "Cliente" }],
        },
      }}
      context={{ ...context, allComponents: [] }}
    />,
  );
  expect(screen.getByText("DESTAQUE")).toBeVisible();
  expect(screen.queryByText("Galeria do veículo")).not.toBeInTheDocument();
});
