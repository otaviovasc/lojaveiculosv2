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
          phone2: "4431313131",
          phone3: "4432323232",
        },
        footer: { cnpj: "12.345.678/0001-90", extra_info: "Desde 1999" },
        landing_template: "classic",
        logo_url: "https://cdn.example/logo.png",
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

test("maps the V1 modern template to Aurora", () => {
  const mapped = mapLegacyFoundation({
    settings: {},
    store: { customization: { landing_template: "modern" }, user: {} },
    testimonials: [],
  });

  assert.equal(mapped.layoutKey, "aurora");
  assert.equal(mapped.theme.preset, "aurora");
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
