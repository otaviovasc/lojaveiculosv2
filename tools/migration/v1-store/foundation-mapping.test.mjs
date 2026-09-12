import assert from "node:assert/strict";
import test from "node:test";
import {
  mapLegacyFoundation,
  mapLegacySections,
  mapLegacyTestimonials,
} from "./foundation-mapping.mjs";

test("maps V1 layout order and visibility to V2 storefront sections", () => {
  const sections = mapLegacySections({
    layout: {
      order: ["home", "about", "cars", "contact"],
      visibility: { about: false, cars: true, contact: false, home: true },
    },
  });

  assert.deepEqual(
    sections.map(({ id, type, visible }) => ({ id, type, visible })),
    [
      { id: "header", type: "header", visible: true },
      { id: "home", type: "hero", visible: true },
      { id: "about", type: "about", visible: false },
      { id: "cars", type: "stock", visible: true },
      { id: "depoimentos", type: "testimonials", visible: true },
      { id: "contact", type: "lead", visible: false },
      { id: "footer", type: "footer", visible: true },
    ],
  );
});

test("maps V1 testimonials to the V2 theme contract", () => {
  assert.deepEqual(
    mapLegacyTestimonials([
      {
        description: "Atendimento excelente.",
        id: 19,
        image_url: "https://cdn.example/client.jpg",
        title: "Maria",
      },
    ]),
    [
      {
        id: "legacy-testimonial-19",
        imageSrc: "https://cdn.example/client.jpg",
        name: "Maria",
        order: 0,
        quote: "Atendimento excelente.",
        role: "Cliente",
      },
    ],
  );
});

test("maps V1 contact settings and legacy storefront fields into V2", () => {
  const mapped = mapLegacyFoundation({
    settings: {
      business_hours: "Segunda a sábado, 8h às 18h",
      cep: "87000-000",
      cidade: "Maringá",
      estado: "PR",
      instagram_url: "https://instagram.com/loja",
      whatsapp_number: "5544999999999",
    },
    store: {
      customization: {
        contact: { email: "contato@loja.test", phone: "4430303030" },
        contact_extras: {
          address_full: "Av. Brasil, 1000",
          description1: "Venha nos visitar.",
          description2: "Estamos esperando por você.",
          phone2: "4431313131",
          phone2_label: "Vendas",
          phone3: "4432323232",
          phone3_label: "Pós-venda",
          phone_label: "WhatsApp",
          title: "Fale com a loja",
        },
        footer: { cnpj: "12.345.678/0001-90", extra_info: "Desde 1999" },
        landing_template: "classic",
        logo_url: "https://cdn.example/logo.png",
        map_embed_url: "https://www.google.com/maps/embed?pb=test",
        show_map: true,
      },
      user: { email: "owner@loja.test" },
    },
    testimonials: [
      { description: "Recomendo.", id: 7, imageUrl: null, title: "João" },
    ],
  });

  assert.equal(mapped.layoutKey, "quadra");
  assert.deepEqual(mapped.profile.businessHours, {
    text: "Segunda a sábado, 8h às 18h",
  });
  assert.equal(mapped.profile.documentNumber, "12.345.678/0001-90");
  assert.equal(mapped.profile.whatsappPhone, "5544999999999");
  assert.equal(
    mapped.theme.socialLinks.instagram,
    "https://instagram.com/loja",
  );
  assert.equal(mapped.theme.contact_extras.phone2, "4431313131");
  assert.equal(mapped.theme.contact_extras.phone3, "4432323232");
  assert.equal(mapped.theme.contact.phone2, "4431313131");
  assert.equal(mapped.theme.contact.phone2Label, "Vendas");
  assert.equal(mapped.theme.contact.phone3, "4432323232");
  assert.equal(mapped.theme.contact.phone3Label, "Pós-venda");
  assert.equal(mapped.theme.contact.phoneLabel, "WhatsApp");
  assert.equal(mapped.theme.contact.title, "Fale com a loja");
  assert.equal(mapped.theme.contact.description1, "Venha nos visitar.");
  assert.equal(
    mapped.theme.contact.mapEmbedUrl,
    "https://www.google.com/maps/embed?pb=test",
  );
  assert.equal(mapped.theme.contact.showMap, true);
  assert.equal(mapped.theme.footer.extra_info, "Desde 1999");
  assert.equal(mapped.theme.testimonials[0].name, "João");
});

test("does not let seeded V1 contact defaults override real fallbacks", () => {
  const mapped = mapLegacyFoundation({
    settings: {
      business_hours: "Segunda a Sexta, 9h às 18h",
      whatsapp_number: "5511940231407",
    },
    store: {
      customization: {
        contact: {
          business_hours: "Sábado, 9h às 13h",
          whatsapp: "5544888888888",
        },
      },
      user: { phone: "5544777777777" },
    },
    testimonials: [],
  });

  assert.equal(mapped.profile.whatsappPhone, "5544888888888");
  assert.deepEqual(mapped.profile.businessHours, {
    text: "Sábado, 9h às 13h",
  });
  assert.equal(mapped.theme.businessHours, "Sábado, 9h às 13h");
});

test("keeps seeded V1 contact defaults when no real fallback exists", () => {
  const mapped = mapLegacyFoundation({
    settings: {
      business_hours: "Segunda a Sexta, 9h às 18h",
      whatsapp_number: "5511940231407",
    },
    store: { customization: {}, user: {} },
    testimonials: [],
  });

  assert.equal(mapped.profile.whatsappPhone, "5511940231407");
  assert.deepEqual(mapped.profile.businessHours, {
    text: "Segunda a Sexta, 9h às 18h",
  });
});

test("preserves V1 testimonial order in mapped theme entries", () => {
  const mapped = mapLegacyTestimonials([
    { description: "Segundo", id: 2, order: 20, title: "B" },
    { description: "Primeiro", id: 1, order: 10, title: "A" },
  ]);

  assert.deepEqual(
    mapped.map(({ id, order }) => ({ id, order })),
    [
      { id: "legacy-testimonial-2", order: 20 },
      { id: "legacy-testimonial-1", order: 10 },
    ],
  );
});

test("maps the client-used V1 modern template to Quadra", () => {
  const mapped = mapLegacyFoundation({
    settings: {},
    store: { customization: { landing_template: "modern" }, user: {} },
    testimonials: [],
  });

  assert.equal(mapped.layoutKey, "quadra");
  assert.equal(mapped.theme.preset, "quadra");
  assert.equal(mapped.theme.heroMediaSource, "vehicles");
});

test("normalizes V1 Modern responsive banner mode into the V2 hero contract", () => {
  const mapped = mapLegacyFoundation({
    settings: {},
    store: {
      customization: {
        banner_button_text: "Conferir estoque",
        banner_mobile_url: "https://cdn.example/banner-mobile.jpg",
        banner_mode: true,
        banner_pc_url: "https://cdn.example/banner-desktop.jpg",
        banner_show_button: true,
        banner_show_text: false,
        hero_banners: [
          "https://cdn.example/banner-1.jpg",
          "  ",
          null,
          "https://cdn.example/banner-2.jpg",
        ],
        landing_template: "modern",
      },
      user: {},
    },
    testimonials: [],
  });

  assert.equal(mapped.theme.heroBannerMode, true);
  assert.equal(mapped.theme.heroMediaSource, "banners");
  assert.deepEqual(mapped.theme.heroBannerUrls, [
    "https://cdn.example/banner-1.jpg",
    "https://cdn.example/banner-2.jpg",
  ]);
  assert.equal(
    mapped.theme.heroBannerDesktopUrl,
    "https://cdn.example/banner-desktop.jpg",
  );
  assert.equal(
    mapped.theme.heroBannerMobileUrl,
    "https://cdn.example/banner-mobile.jpg",
  );
  assert.equal(mapped.theme.heroBannerShowText, false);
  assert.equal(mapped.theme.heroBannerShowButton, true);
  assert.equal(mapped.theme.heroBannerButtonText, "Conferir estoque");
});

test("normalizes the older V1 hero template without changing vehicle defaults", () => {
  const banner = mapLegacyFoundation({
    settings: {},
    store: {
      customization: {
        hero_banners: ["https://cdn.example/legacy-banner.jpg"],
        hero_template: "banner",
      },
      user: {},
    },
    testimonials: [],
  });
  const vehicles = mapLegacyFoundation({
    settings: {},
    store: { customization: { hero_template: "default" }, user: {} },
    testimonials: [],
  });

  assert.equal(banner.theme.heroMediaSource, "banners");
  assert.equal(banner.theme.heroBannerMode, false);
  assert.equal(vehicles.theme.heroMediaSource, "vehicles");
});

test("keeps already embedded testimonials when the legacy table is empty", () => {
  const testimonial = {
    id: "existing",
    imageSrc: null,
    name: "Cliente existente",
    quote: "Já estava configurado.",
    role: "Cliente",
  };
  const mapped = mapLegacyFoundation({
    settings: {},
    store: { customization: { testimonials: [testimonial] }, user: {} },
    testimonials: [],
  });

  assert.deepEqual(mapped.theme.testimonials, [testimonial]);
});

test("emits only strict-schema Modern theme keys from SELECT-star legacy rows", () => {
  const mapped = mapLegacyFoundation({
    settings: {
      business_hours: "Segunda a sexta, 9h às 18h",
      cidade: "Maringá",
      created_at: "2024-01-01T00:00:00.000Z",
      id: 91,
      instagram_url: "https://instagram.com/loja",
      tenant_secret: "must-not-leak",
      whatsapp_number: "5544999999999",
    },
    store: {
      customization: {
        about: {
          button_text: "Fale conosco",
          description: "Uma loja feita para quem ama carros.",
          unsupported_about_key: "must-not-leak",
        },
        banner_button_text: "Conferir estoque",
        banner_mode: true,
        banner_pc_url: "https://cdn.example/banner.webp",
        banner_show_button: true,
        contact: {
          email: "contato@loja.test",
          phone: "4430303030",
          raw_contact_column: "must-not-leak",
          whatsapp: "5544999999999",
        },
        contact_extras: {
          address_full: "Av. Brasil, 1000",
          title: "Fale com a loja",
          unsupported_contact_extra: "must-not-leak",
        },
        created_at: "2024-01-01T00:00:00.000Z",
        footer: {
          cnpj: "12.345.678/0001-90",
          extra_info: "Desde 1999",
          private_footer_note: "must-not-leak",
        },
        hero_banner_autoplay: true,
        hero_banner_speed: 4000,
        hero_banners: ["https://cdn.example/banner.webp"],
        hero_subtitle: "Os melhores veículos da região.",
        landing_template: "modern",
        lead_form: { raw: true, show_on_lp: true, show_on_vehicle: false },
        map_embed_url: "https://www.google.com/maps/embed?pb=storefront",
        raw_database_column: "must-not-leak",
        socialLinks: {
          instagram: "https://instagram.com/customizada",
          privateNetwork: "must-not-leak",
        },
        testimonials: [
          {
            descricao: "Excelente atendimento.",
            id: "legacy-7",
            raw_testimonial_column: "must-not-leak",
            titulo: "Cliente",
          },
        ],
        texto_cabecalho_ofertas: "Nossas ofertas",
      },
      user: {},
    },
    testimonials: [],
  });

  assert.equal(Object.hasOwn(mapped.theme, "raw_database_column"), false);
  assert.equal(Object.hasOwn(mapped.theme, "created_at"), false);
  assert.equal(Object.hasOwn(mapped.theme.settings, "id"), false);
  assert.equal(Object.hasOwn(mapped.theme.settings, "created_at"), false);
  assert.equal(Object.hasOwn(mapped.theme.settings, "tenant_secret"), false);
  assert.equal(
    Object.hasOwn(mapped.theme.contact, "raw_contact_column"),
    false,
  );
  assert.equal(
    Object.hasOwn(mapped.theme.about, "unsupported_about_key"),
    false,
  );
  assert.equal(
    Object.hasOwn(mapped.theme.contact_extras, "unsupported_contact_extra"),
    false,
  );
  assert.equal(
    Object.hasOwn(mapped.theme.footer, "private_footer_note"),
    false,
  );
  assert.equal(Object.hasOwn(mapped.theme.lead_form, "raw"), false);
  assert.equal(
    Object.hasOwn(mapped.theme.socialLinks, "privateNetwork"),
    false,
  );
  assert.equal(
    Object.hasOwn(mapped.theme.testimonials[0], "raw_testimonial_column"),
    false,
  );

  assert.equal(mapped.theme.about.button_text, "Fale conosco");
  assert.equal(mapped.theme.banner_mode, true);
  assert.equal(mapped.theme.hero_banner_autoplay, true);
  assert.equal(mapped.theme.hero_banner_speed, 4000);
  assert.deepEqual(mapped.theme.hero_banners, [
    "https://cdn.example/banner.webp",
  ]);
  assert.equal(mapped.theme.lead_form.show_on_lp, true);
  assert.equal(mapped.theme.lead_form.show_on_vehicle, false);
  assert.equal(
    mapped.theme.map_embed_url,
    "https://www.google.com/maps/embed?pb=storefront",
  );
  assert.equal(mapped.theme.contact.address, "Av. Brasil, 1000");
  assert.equal(mapped.theme.footer.extra_info, "Desde 1999");
  assert.equal(
    mapped.theme.socialLinks.instagram,
    "https://instagram.com/customizada",
  );
  assert.deepEqual(mapped.theme.testimonials[0], {
    id: "legacy-7",
    imageSrc: null,
    name: "Cliente",
    quote: "Excelente atendimento.",
    role: "Cliente",
  });
});
