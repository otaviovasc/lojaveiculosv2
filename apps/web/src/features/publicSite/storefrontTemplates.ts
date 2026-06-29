export const storefrontTemplateKeys = [
  "aurora",
  "quadra",
  "showroom",
  "classic",
] as const;

export type StorefrontTemplateKey = (typeof storefrontTemplateKeys)[number];

export type StorefrontTheme = {
  badgeLabel: string;
  ctaLabel: string;
  headline: string;
  sections: string[];
  tone: string;
};

export type StorefrontTemplate = {
  description: string;
  key: StorefrontTemplateKey;
  label: string;
  theme: StorefrontTheme;
};

export const storefrontTemplates: readonly StorefrontTemplate[] = [
  {
    description: "Visual refinado para vitrines de alto padrao.",
    key: "aurora",
    label: "Aurora",
    theme: {
      badgeLabel: "Curadoria da loja",
      ctaLabel: "Chamar no WhatsApp",
      headline: "Veiculos selecionados para compra segura",
      sections: ["featured", "trust", "contact"],
      tone: "premium",
    },
  },
  {
    description: "Marca direta com foco em estoque e contato rapido.",
    key: "quadra",
    label: "Quadra",
    theme: {
      badgeLabel: "Estoque atualizado",
      ctaLabel: "Tenho interesse",
      headline: "Estoque completo com atendimento direto",
      sections: ["featured", "trust", "contact"],
      tone: "brand",
    },
  },
  {
    description: "Hero visual, prova de confianca e cards maiores.",
    key: "showroom",
    label: "Showroom",
    theme: {
      badgeLabel: "Curadoria da loja",
      ctaLabel: "Chamar no WhatsApp",
      headline: "Veiculos selecionados para compra segura",
      sections: ["featured", "financing", "trust", "contact"],
      tone: "premium",
    },
  },
  {
    description: "Listagem objetiva para estoque com maior giro.",
    key: "classic",
    label: "Classico",
    theme: {
      badgeLabel: "Estoque atualizado",
      ctaLabel: "Tenho interesse",
      headline: "Estoque completo com atendimento direto",
      sections: ["featured", "trust", "contact"],
      tone: "operational",
    },
  },
];

const fallbackStorefrontTemplate = storefrontTemplates[1] as StorefrontTemplate;

export function normalizeStorefrontTemplateKey(
  layoutKey: string | null | undefined,
): StorefrontTemplateKey {
  if (layoutKey === "aurora") return "aurora";
  if (layoutKey === "quadra") return "quadra";
  if (layoutKey === "showroom") return "showroom";
  return "classic";
}

export function getStorefrontTemplate(key: string | null | undefined) {
  const normalizedKey = normalizeStorefrontTemplateKey(key);
  return (
    storefrontTemplates.find((template) => template.key === normalizedKey) ??
    fallbackStorefrontTemplate
  );
}

export function createStorefrontTheme(
  rawTheme: Record<string, unknown>,
  layoutKey: string | null | undefined,
): StorefrontTheme {
  const template = getStorefrontTemplate(layoutKey);
  return {
    ...template.theme,
    badgeLabel: readString(rawTheme.badgeLabel, template.theme.badgeLabel),
    ctaLabel: readString(rawTheme.ctaLabel, template.theme.ctaLabel),
    headline: readString(
      rawTheme.heroTitle,
      readString(rawTheme.headline, template.theme.headline),
    ),
    sections: readSections(rawTheme.sections, template.theme.sections),
    tone: readString(rawTheme.tone, template.theme.tone),
  };
}

export function applyStorefrontTemplate(
  rawTheme: Record<string, unknown>,
  key: StorefrontTemplateKey,
) {
  const template = getStorefrontTemplate(key);
  const current = createStorefrontTheme(rawTheme, key);
  return {
    ...current,
    ...template.theme,
  };
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function readSections(value: unknown, fallback: readonly string[]) {
  if (!Array.isArray(value)) return [...fallback];
  const sections = value.filter(
    (item): item is string => typeof item === "string",
  );
  return sections.length ? sections : [...fallback];
}
