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
  const heroBannerDesktopUrl = nullableString(
    customization.banner_pc_url,
    2048,
  );
  const heroBannerMobileUrl = nullableString(
    customization.banner_mobile_url,
    2048,
  );
  const heroBannerMode = customization.banner_mode === true;
  const heroBannerUrls = nullableStringArray(customization.hero_banners, 2048);
  const heroMediaSource =
    heroBannerMode || customization.hero_template === "banner"
      ? "banners"
      : "vehicles";
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
  const legacyTheme = mapSupportedLegacyTheme(customization, settings);
  const socialLinks = json(customization.socialLinks);
  const theme = {
    ...legacyTheme,
    businessHours,
    configVersion: 1,
    contact: {
      address: addressLine1,
      businessHours,
      business_hours: nullableString(contact.business_hours, 500),
      description1: nullableString(contactExtras.description1, 500),
      description2: nullableString(contactExtras.description2, 500),
      email: profile.contactEmail,
      instagram_url: nullableString(contact.instagram_url, 2048),
      mapEmbedUrl: safeGoogleMapsUrl(customization.map_embed_url),
      phone: profile.contactPhone,
      phone2: nullableString(contactExtras.phone2, 40),
      phone2Label: nullableString(contactExtras.phone2_label, 80),
      phone3: nullableString(contactExtras.phone3, 40),
      phone3Label: nullableString(contactExtras.phone3_label, 80),
      phoneLabel: nullableString(contactExtras.phone_label, 80),
      showMap: customization.show_map !== false,
      title: nullableString(contactExtras.title, 120),
      whatsapp: nullableString(contact.whatsapp, 40),
      whatsapp_number: nullableString(contact.whatsapp_number, 40),
    },
    heroBannerButtonText: nullableString(customization.banner_button_text, 120),
    heroBannerDesktopUrl,
    heroBannerMode,
    heroBannerMobileUrl,
    heroBannerShowButton: customization.banner_show_button === true,
    heroBannerShowText: customization.banner_show_text === true,
    heroBannerUrls,
    heroImageUrl: nullableString(customization.hero_image_url),
    heroMediaSource,
    logoUrl: profile.logoImageUrl,
    preset: layoutKey,
    sections: mapLegacySections(customization),
    socialLinks: {
      facebook: nullableString(socialLinks.facebook, 2048),
      instagram: nullableString(socialLinks.instagram, 2048) ?? instagram,
      tiktok: nullableString(socialLinks.tiktok, 2048),
      whatsapp: nullableString(socialLinks.whatsapp, 40) ?? whatsappPhone,
      youtube: nullableString(socialLinks.youtube, 2048),
    },
    testimonials: migratedTestimonials(customization, data.testimonials),
  };
  return { layoutKey, profile, theme };
}

function mapSupportedLegacyTheme(customization, settings) {
  const about = json(customization.about);
  const contactExtras = json(customization.contact_extras);
  const footer = json(customization.footer);
  const leadForm = json(customization.lead_form);
  const layout = json(customization.layout);
  const visibility = json(layout.visibility);
  return {
    about: {
      button_text: nullableString(about.button_text, 120),
      curadoria_text: nullableString(about.curadoria_text, 500),
      description: nullableString(about.description, 500),
      features: mapAboutFeatures(about.features),
      image1_url: nullableString(about.image1_url, 2048),
      image2_url: nullableString(about.image2_url, 2048),
      title: nullableString(about.title, 120),
      visual_subtitle: nullableString(about.visual_subtitle, 120),
      visual_title: nullableString(about.visual_title, 120),
      why_text: nullableString(about.why_text, 500),
      why_title: nullableString(about.why_title, 120),
    },
    banner_button_text: nullableString(customization.banner_button_text, 120),
    banner_mobile_url: nullableString(customization.banner_mobile_url, 2048),
    banner_mode: optionalBoolean(customization.banner_mode),
    banner_pc_url: nullableString(customization.banner_pc_url, 2048),
    banner_show_button: optionalBoolean(customization.banner_show_button),
    banner_show_text: optionalBoolean(customization.banner_show_text),
    contact_extras: {
      address_full: nullableString(contactExtras.address_full, 191),
      description1: nullableString(contactExtras.description1, 500),
      description2: nullableString(contactExtras.description2, 500),
      phone2: nullableString(contactExtras.phone2, 40),
      phone2_label: nullableString(contactExtras.phone2_label, 120),
      phone3: nullableString(contactExtras.phone3, 40),
      phone3_label: nullableString(contactExtras.phone3_label, 120),
      phone_label: nullableString(contactExtras.phone_label, 120),
      title: nullableString(contactExtras.title, 160),
    },
    cor_primaria: hexColor(customization.cor_primaria),
    default_vehicle_images: mapNullableStrings(
      customization.default_vehicle_images,
      2048,
    ),
    footer: {
      cnpj: nullableString(footer.cnpj, 32),
      extra_info: nullableString(footer.extra_info, 500),
      extraInfo: nullableString(footer.extraInfo, 500),
    },
    hero_banner_autoplay: optionalBoolean(customization.hero_banner_autoplay),
    hero_banner_speed: integerInRange(
      customization.hero_banner_speed,
      500,
      60_000,
    ),
    hero_banners: nullableStringArray(customization.hero_banners, 2048),
    hero_image_url: nullableString(customization.hero_image_url, 2048),
    hero_s3_key: nullableString(customization.hero_s3_key, 1024),
    hero_subtitle: nullableString(customization.hero_subtitle, 500),
    hero_template: enumValue(customization.hero_template, [
      "default",
      "banner",
    ]),
    landing_template: enumValue(customization.landing_template, [
      "classic",
      "modern",
    ]),
    layout: {
      order: Array.isArray(layout.order)
        ? uniqueKnownSections(layout.order)
        : undefined,
      visibility: {
        about: optionalBoolean(visibility.about),
        cars: optionalBoolean(visibility.cars),
        contact: optionalBoolean(visibility.contact),
        depoimentos: optionalBoolean(visibility.depoimentos),
        home: optionalBoolean(visibility.home),
      },
    },
    lead_form: {
      show_on_lp: optionalBoolean(leadForm.show_on_lp),
      show_on_vehicle: optionalBoolean(leadForm.show_on_vehicle),
    },
    logo_height: nonnegativeNumber(customization.logo_height, 1000),
    logo_s3_key: nullableString(customization.logo_s3_key, 1024),
    logo_url: nullableString(customization.logo_url, 2048),
    logo_width: nonnegativeNumber(customization.logo_width, 1000),
    map_embed_url: safeGoogleMapsUrl(customization.map_embed_url),
    map_location: mapLocation(customization.map_location),
    settings: {
      business_hours: nullableString(settings.business_hours, 500),
      cep: nullableString(settings.cep, 32),
      cidade: nullableString(settings.cidade, 120),
      estado: nullableString(settings.estado, 80),
      instagram_url: nullableString(settings.instagram_url, 2048),
      whatsapp_number: nullableString(settings.whatsapp_number, 40),
    },
    show_fipe_thermometer: optionalBoolean(customization.show_fipe_thermometer),
    show_map: optionalBoolean(customization.show_map),
    texto_cabecalho_ofertas: nullableString(
      customization.texto_cabecalho_ofertas,
      120,
    ),
  };
}

function mapAboutFeatures(value) {
  if (!Array.isArray(value)) return undefined;
  return value.flatMap((candidate) => {
    const feature = json(candidate);
    const title = nullableString(feature.title, 120);
    const description = nullableString(feature.description, 500);
    return title && description ? [{ description, title }] : [];
  });
}

function mapNullableStrings(value, max) {
  if (!Array.isArray(value)) return undefined;
  return value.flatMap((candidate) => {
    if (candidate === null) return [null];
    const normalized = nullableString(candidate, max);
    return normalized ? [normalized] : [];
  });
}

function mapLocation(value) {
  if (value === null) return null;
  const location = json(value);
  const lat = finiteNumber(location.lat);
  const lng = finiteNumber(location.lng);
  return lat !== null &&
    lat >= -90 &&
    lat <= 90 &&
    lng !== null &&
    lng >= -180 &&
    lng <= 180
    ? { lat, lng }
    : undefined;
}

function safeGoogleMapsUrl(value) {
  const candidate = nullableString(value, 2048);
  if (!candidate) return candidate;
  try {
    const url = new URL(candidate);
    const hostname = url.hostname.toLowerCase();
    const isGoogle =
      hostname === "google.com" ||
      hostname === "maps.google.com" ||
      hostname === "www.google.com" ||
      hostname.endsWith(".google.com.br");
    return url.protocol === "https:" && isGoogle ? candidate : undefined;
  } catch {
    return undefined;
  }
}

function enumValue(value, allowed) {
  return allowed.includes(value) ? value : undefined;
}

function optionalBoolean(value) {
  return typeof value === "boolean" ? value : undefined;
}

function integerInRange(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max
    ? value
    : undefined;
}

function nonnegativeNumber(value, max) {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= max
    ? value
    : undefined;
}

function hexColor(value) {
  const color = nullableString(value, 9);
  return color &&
    /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(color)
    ? color
    : undefined;
}

function nullableStringArray(value, max) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const normalized = nullableString(item, max);
    return normalized ? [normalized] : [];
  });
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
  if (!Array.isArray(customization.testimonials)) return [];
  return customization.testimonials.flatMap((candidate, index) => {
    const testimonial = json(candidate);
    const id =
      nullableString(testimonial.id, 80) ??
      `legacy-embedded-testimonial-${index}`;
    const name = nullableString(
      testimonial.name ?? testimonial.titulo ?? testimonial.title,
      120,
    );
    const quote = nullableString(
      testimonial.quote ?? testimonial.descricao ?? testimonial.description,
      500,
    );
    if (!name || !quote) return [];
    const order = finiteNumber(testimonial.order ?? testimonial.ordem);
    return [
      {
        id,
        imageSrc: nullableString(
          testimonial.imageSrc ??
            testimonial.imagem_url ??
            testimonial.image_url,
          2048,
        ),
        name,
        ...(order === null ? {} : { order }),
        quote,
        role:
          nullableString(testimonial.role ?? testimonial.cargo, 120) ??
          "Cliente",
      },
    ];
  });
}

function legacyLayoutKey(customization) {
  const template = nullableString(
    customization.landing_template ?? customization.templateId,
    80,
  );
  return template === "aurora" ? "aurora" : "quadra";
}

function uniqueKnownSections(values) {
  return Array.from(
    new Set(values.filter((value) => Object.hasOwn(SECTION_TYPES, value))),
  );
}
