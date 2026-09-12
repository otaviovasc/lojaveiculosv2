import { describe, expect, it } from "vitest";
import type { StorefrontCustomPage } from "@lojaveiculosv2/shared";
import {
  applyPublicVehicleVitrinePrice,
  hasRequiredVehicleVitrineBinding,
} from "./publicVehicleVitrinePrice.js";
import {
  vehicleVitrineLegacyAdoptionUpdate,
  vehicleVitrineReuseUpdate,
} from "./drizzleStorefrontVehicleVitrineWrite.js";

describe("vehicle Vitrine repository reuse", () => {
  it("only changes publication state so manual editor content survives reuse", () => {
    const update = vehicleVitrineReuseUpdate(true);

    expect(update.isPublished).toBe(true);
    expect(update.updatedAt).toBeInstanceOf(Date);
    expect(update).not.toHaveProperty("components");
    expect(update).not.toHaveProperty("description");
    expect(update).not.toHaveProperty("slug");
    expect(update).not.toHaveProperty("title");
  });

  it("adopts a legacy deterministic-slug page without overwriting editor content", () => {
    const update = vehicleVitrineLegacyAdoptionUpdate("listing_1", true);

    expect(update).toMatchObject({
      isPublished: true,
      sourceListingId: "listing_1",
    });
    expect(update.updatedAt).toBeInstanceOf(Date);
    expect(update).not.toHaveProperty("components");
    expect(update).not.toHaveProperty("description");
    expect(update).not.toHaveProperty("slug");
    expect(update).not.toHaveProperty("title");
  });

  it("blocks an unbound vehicle Vitrine from the public route until adoption", () => {
    const legacyPage = legacyVehiclePage();
    legacyPage.sourceListingId = null;

    expect(hasRequiredVehicleVitrineBinding(legacyPage)).toBe(false);
    expect(hasRequiredVehicleVitrineBinding(legacyVehiclePage())).toBe(true);
    expect(
      hasRequiredVehicleVitrineBinding({
        ...legacyPage,
        components: [],
      }),
    ).toBe(true);
  });

  it("projects the current public price without mutating persisted components", () => {
    const page = legacyVehiclePage();

    const visible = applyPublicVehicleVitrinePrice(
      page,
      129_900_00,
      100_000_00,
    );

    expect(visible.components[0]?.props.subtitle).toContain("R$ 129.900");
    expect(visible.components[0]?.props.subtitle).not.toContain("R$ 100.000");
    expect(visible.components[0]?.props.ctaUrl).toContain("R%24%C2%A0129.900");
    expect(visible.components[0]?.props.ctaUrl).toContain("%20imperdível");
    expect(page.components[0]?.props.subtitle).toContain("R$ 100.000");
  });

  it("keeps a newly hidden Vitrine price-free", () => {
    const page = legacyVehiclePage();
    page.components[0] = {
      ...page.components[0]!,
      props: {
        ...page.components[0]!.props,
        subtitle: "Condição comercial sob consulta · 10.000 km",
      },
    };

    const hidden = applyPublicVehicleVitrinePrice(page, null);

    expect(hidden.components[0]?.props.subtitle).toBe(
      "Sob consulta · 10.000 km",
    );
  });

  it("removes a previously persisted price when the listing later hides it", () => {
    const hidden = applyPublicVehicleVitrinePrice(
      legacyVehiclePage(),
      null,
      100_000_00,
    );
    const serialized = JSON.stringify(hidden.components);

    expect(serialized).toContain("Sob consulta");
    expect(serialized).not.toContain("100.000");
    expect(serialized).not.toContain("R$ 100.000");
    expect(serialized).not.toContain("R%24%20100.000");
  });

  it("preserves unrelated component amounts and redacts bound-page metadata", () => {
    const page = legacyVehiclePage();
    page.title = "Oferta por R$ 100.000";
    page.description = "Veículo anunciado por R$ 100.000";
    page.seo = {
      metaDescription: "Compre por R$ 100.000",
      metaTitle: "Oferta R$ 100.000",
      ogImageUrl: "https://cdn.example/og.png",
    };
    page.components.push({
      id: "finance-copy",
      order: 1,
      props: { text: "Financiamento com entrada de R$ 5.000" },
      type: "text_block",
      visible: true,
    });

    const hidden = applyPublicVehicleVitrinePrice(page, null);

    expect(hidden.components[1]?.props.text).toBe(
      "Financiamento com entrada de R$ 5.000",
    );
    expect(hidden.title).toBe("Oferta por Valor sob consulta");
    expect(hidden.description).toBe("Veículo anunciado por Valor sob consulta");
    expect(hidden.seo).toMatchObject({
      metaDescription: "Compre por Valor sob consulta",
      metaTitle: "Oferta Valor sob consulta",
      ogImageUrl: "https://cdn.example/og.png",
    });
  });

  it("projects only the exact source asking price in hero copy and URL", () => {
    const page = legacyVehiclePage();
    page.components[0] = {
      ...page.components[0]!,
      props: {
        ...page.components[0]!.props,
        ctaUrl:
          "https://example.com/?oferta=R%24%20100.000&entrada=R%24%205.000",
        subtitle: "Oferta: R$ 100.000 · entrada de R$ 5.000",
      },
    };

    const hidden = applyPublicVehicleVitrinePrice(page, null, 100_000_00);

    expect(hidden.components[0]?.props.subtitle).toBe(
      "Oferta: Sob consulta · entrada de R$ 5.000",
    );
    expect(hidden.components[0]?.props.ctaUrl).toBe(
      "https://example.com/?oferta=Sob%20consulta&entrada=R%24%205.000",
    );
  });
});

function legacyVehiclePage(): StorefrontCustomPage {
  return {
    components: [
      {
        id: "hero",
        order: 0,
        props: {
          ctaUrl:
            "https://example.com/?text=Oferta%20R%24%20100.000%20imperdível",
          pageVariant: "vehicle-vitrine",
          subtitle: "R$ 100.000 · 10.000 km · Automático",
        },
        type: "hero",
        visible: true,
      },
    ],
    id: "page_1",
    order: 0,
    secretToken: "secret",
    slug: "vitrine-veiculo-listing-1",
    sourceListingId: "listing_1",
    title: "Página editada",
    visible: true,
  };
}
