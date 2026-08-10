import { json, nullableString } from "./common.mjs";

const DEFAULT_SECTION_ORDER = [
  "home",
  "cars",
  "depoimentos",
  "about",
  "contact",
];

const DEFAULT_BUSINESS_HOURS = "Segunda a Sexta, 9h às 18h";
const DEFAULT_WHATSAPP_NUMBER = "5511940231407";

const SECTION_TYPES = {
  about: ["about", "standard"],
  cars: ["stock", "grid-compact"],
  contact: ["lead", "standard"],
  depoimentos: ["testimonials", "standard"],
  home: ["hero", "split"],
};

export function mapLegacyFoundation(data) {
  const store = data.store;
  const customization = json(store.customization);
  const settings = json(data.settings);
  const owner = json(store.user);
  const ownerAddress = json(owner.address);
  const contact = json(customization.contact);
  const contactExtras = json(customization.contact_extras);
  const footer = json(customization.footer);
  const businessHours = preferNonPlaceholder(
    settings.business_hours,
    DEFAULT_BUSINESS_HOURS,
    [
      contact.businessHours,
      contact.business_hours,
      customization.businessHours,
      customization.business_hours,
    ],
    500,
  );
  const whatsappPhone = preferNonPlaceholder(
    settings.whatsapp_number,
    DEFAULT_WHATSAPP_NUMBER,
    [contact.whatsapp, contact.phone, owner.phone],
    40,
  );
  const instagram = nullableString(settings.instagram_url, 2048);
  const addressLine1 = nullableString(
    contactExtras.address_full ?? ownerAddress.street ?? ownerAddress.address,
    191,
  );
  const profile = {
    addressCity: nullableString(settings.cidade ?? ownerAddress.city, 120),
    addressLine1,
    addressLine2: nullableString(
      ownerAddress.number ?? ownerAddress.complement,
      191,
    ),
    addressState: nullableString(settings.estado ?? ownerAddress.state, 80),
    addressZipCode: nullableString(settings.cep ?? ownerAddress.zipCode, 32),
    businessHours: businessHours ? { text: businessHours } : {},
    contactEmail: nullableString(contact.email ?? owner.email, 254),
    contactPhone: nullableString(contact.phone ?? owner.phone, 40),
    documentNumber: nullableString(footer.cnpj ?? owner.cpfCnpj, 32),
    logoImageUrl: nullableString(customization.logo_url),
    whatsappPhone,
  };
  const layoutKey = legacyLayoutKey(customization);
  const theme = {
    ...customization,
    businessHours,
    configVersion: 1,
    contact: {
      ...contact,
      address: addressLine1,
      businessHours,
      email: profile.contactEmail,
      phone: profile.contactPhone,
    },
    heroImageUrl: nullableString(customization.hero_image_url),
    logoUrl: profile.logoImageUrl,
    preset: layoutKey,
    sections: mapLegacySections(customization),
    settings,
    socialLinks: {
      ...json(customization.socialLinks),
      instagram,
      whatsapp: whatsappPhone,
    },
    testimonials: migratedTestimonials(customization, data.testimonials),
  };
  return { layoutKey, profile, theme };
}

export function mapLegacySections(customization) {
  const layout = json(customization.layout);
  const visibility = json(layout.visibility);
  const configuredOrder = Array.isArray(layout.order)
    ? layout.order.filter((value) => typeof value === "string")
    : DEFAULT_SECTION_ORDER;
  const order = uniqueKnownSections(configuredOrder);
  if (!order.includes("depoimentos")) {
    const carsIndex = order.indexOf("cars");
    order.splice(
      carsIndex < 0 ? order.length : carsIndex + 1,
      0,
      "depoimentos",
    );
  }
  const content = order.map((legacyId, index) => {
    const [type, variant] = SECTION_TYPES[legacyId];
    return {
      id: legacyId,
      order: index + 1,
      type,
      variant,
      visible:
        typeof visibility[legacyId] === "boolean" ? visibility[legacyId] : true,
    };
  });
  return [
    {
      id: "header",
      order: 0,
      type: "header",
      variant: "opaque",
      visible: true,
    },
    ...content,
    {
      id: "footer",
      order: content.length + 1,
      type: "footer",
      variant: "standard",
      visible: true,
    },
  ];
}

export function mapLegacyTestimonials(testimonials) {
  if (!Array.isArray(testimonials)) return [];
  return testimonials.map((testimonial, index) => ({
    id: `legacy-testimonial-${testimonial.id}`.slice(0, 80),
    imageSrc: nullableString(
      testimonial.image_url ?? testimonial.imageUrl,
      2048,
    ),
    name: nullableString(testimonial.title, 120) ?? "Cliente",
    order: finiteNumber(testimonial.order ?? testimonial.displayOrder) ?? index,
    quote:
      nullableString(testimonial.description, 500) ?? "Avaliação de cliente",
    role: "Cliente",
  }));
}

function preferNonPlaceholder(value, placeholder, fallbacks, max) {
  const setting = nullableString(value, max);
  const fallback = fallbacks
    .map((candidate) => nullableString(candidate, max))
    .find(Boolean);
  if (setting && setting !== placeholder) return setting;
  return fallback ?? setting;
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function migratedTestimonials(customization, testimonials) {
  const migrated = mapLegacyTestimonials(testimonials);
  if (migrated.length) return migrated;
  return Array.isArray(customization.testimonials)
    ? customization.testimonials
    : [];
}

function legacyLayoutKey(customization) {
  const template = nullableString(
    customization.landing_template ?? customization.templateId,
    80,
  );
  return template === "modern" || template === "aurora" ? "aurora" : "quadra";
}

function uniqueKnownSections(values) {
  return Array.from(
    new Set(values.filter((value) => Object.hasOwn(SECTION_TYPES, value))),
  );
}
