import { z } from "zod";

export const PropertyTypeSchema = z.enum([
  "APARTAMENTO",
  "CASA",
  "STUDIO",
  "COBERTURA",
  "SOBRADO",
  "TERRENO",
  "SALA_COMERCIAL",
  "GALPAO",
  "RURAL",
  "KITNET",
  "LOFT",
]);
export type PropertyType = z.infer<typeof PropertyTypeSchema>;

export const PropertyPurposeSchema = z.enum(["VENDA", "ALUGUEL", "AMBOS"]);
export type PropertyPurpose = z.infer<typeof PropertyPurposeSchema>;

export const PropertyStatusSchema = z.enum([
  "RASCUNHO",
  "DISPONIVEL",
  "ALUGADO",
  "VENDIDO",
  "RESERVADO",
  "INATIVO",
]);
export type PropertyStatus = z.infer<typeof PropertyStatusSchema>;

export const AMENITIES = [
  "piscina",
  "churrasqueira",
  "academia",
  "playground",
  "salao_festas",
  "sauna",
  "quadra_esportiva",
  "portaria_24h",
  "elevador",
  "garagem_coberta",
  "pet_friendly",
  "mobiliado",
  "ar_condicionado",
  "aquecimento_central",
  "energia_solar",
  "jardim",
  "varanda",
  "lavanderia",
  "coworking",
  "bicicletario",
  "rooftop",
  "vista_mar",
  "vista_cidade",
  "condominio_fechado",
] as const;

export const AmenitySchema = z.enum(AMENITIES);
export type Amenity = z.infer<typeof AmenitySchema>;

export const PHOTO_SPACE_TYPES = [
  "sala",
  "cozinha",
  "area_externa",
  "escritorio",
  "lavanderia",
  "garagem",
  "fachada",
  "varanda",
  "quarto",
  "suite",
  "banheiro",
  "vaga",
  "custom",
] as const;

export const PhotoSpaceTypeSchema = z.enum(PHOTO_SPACE_TYPES);
export type PhotoSpaceType = z.infer<typeof PhotoSpaceTypeSchema>;

export const PhotoSpaceDefinitionSchema = z.object({
  spaceType: PhotoSpaceTypeSchema,
  spaceIndex: z.number().int().min(1).optional().nullable(),
  spaceLabel: z.string().min(1).max(80),
  spaceOrder: z.number().int().min(0),
  isSuggested: z.boolean().default(true),
});
export type PhotoSpaceDefinition = z.infer<typeof PhotoSpaceDefinitionSchema>;

export const DEFAULT_PHOTO_SPACES: PhotoSpaceDefinition[] = [
  {
    spaceType: "fachada",
    spaceIndex: null,
    spaceLabel: "Fachada",
    spaceOrder: 0,
    isSuggested: true,
  },
  {
    spaceType: "sala",
    spaceIndex: null,
    spaceLabel: "Sala",
    spaceOrder: 1,
    isSuggested: true,
  },
  {
    spaceType: "cozinha",
    spaceIndex: null,
    spaceLabel: "Cozinha",
    spaceOrder: 2,
    isSuggested: true,
  },
  {
    spaceType: "area_externa",
    spaceIndex: null,
    spaceLabel: "Área Externa",
    spaceOrder: 3,
    isSuggested: true,
  },
  {
    spaceType: "escritorio",
    spaceIndex: null,
    spaceLabel: "Escritório",
    spaceOrder: 4,
    isSuggested: true,
  },
  {
    spaceType: "lavanderia",
    spaceIndex: null,
    spaceLabel: "Lavanderia",
    spaceOrder: 5,
    isSuggested: true,
  },
  {
    spaceType: "garagem",
    spaceIndex: null,
    spaceLabel: "Garagem",
    spaceOrder: 6,
    isSuggested: true,
  },
  {
    spaceType: "varanda",
    spaceIndex: null,
    spaceLabel: "Varanda",
    spaceOrder: 7,
    isSuggested: true,
  },
];

export function formatPhotoSpaceLabel(params: {
  spaceType: PhotoSpaceType;
  spaceIndex?: number | null;
  spaceLabel?: string | null;
}): string {
  if (params.spaceLabel?.trim()) return params.spaceLabel.trim();

  const baseLabels: Record<PhotoSpaceType, string> = {
    sala: "Sala",
    cozinha: "Cozinha",
    area_externa: "Área Externa",
    escritorio: "Escritório",
    lavanderia: "Lavanderia",
    garagem: "Garagem",
    fachada: "Fachada",
    varanda: "Varanda",
    quarto: "Quarto",
    suite: "Suíte",
    banheiro: "Banheiro",
    vaga: "Vaga",
    custom: "Personalizado",
  };

  const base = baseLabels[params.spaceType];
  return params.spaceIndex ? `${base} ${params.spaceIndex}` : base;
}

export function getPhotoSpaceKey(params: {
  spaceType?: PhotoSpaceType | null;
  spaceIndex?: number | null;
  spaceLabel?: string | null;
}): string {
  if (!params.spaceType) return "unassigned";
  if (params.spaceType === "custom") {
    return `custom:${(params.spaceLabel ?? "").trim().toLowerCase()}`;
  }
  return params.spaceIndex
    ? `${params.spaceType}:${params.spaceIndex}`
    : params.spaceType;
}

export function getLegacyPhotoOrder(
  spaceOrder: number,
  orderInSpace: number,
): number {
  return spaceOrder * 1000 + orderInSpace;
}

export function buildSuggestedPhotoSpaces(params: {
  bedrooms?: number | null;
  suites?: number | null;
  bathrooms?: number | null;
  parkingSpots?: number | null;
}): PhotoSpaceDefinition[] {
  const spaces = [...DEFAULT_PHOTO_SPACES];
  let nextOrder = spaces.length;

  const appendIndexedSpaces = (
    spaceType: PhotoSpaceType,
    count?: number | null,
  ) => {
    const safeCount = Number.isFinite(count) ? Math.max(0, Number(count)) : 0;
    for (let index = 1; index <= safeCount; index += 1) {
      spaces.push({
        spaceType,
        spaceIndex: index,
        spaceLabel: formatPhotoSpaceLabel({ spaceType, spaceIndex: index }),
        spaceOrder: nextOrder,
        isSuggested: true,
      });
      nextOrder += 1;
    }
  };

  appendIndexedSpaces("quarto", params.bedrooms);
  appendIndexedSpaces("suite", params.suites);
  appendIndexedSpaces("banheiro", params.bathrooms);
  appendIndexedSpaces("vaga", params.parkingSpots);

  return spaces;
}

export const AddressSchema = z.object({
  cep: z
    .string()
    .regex(/^\d{5}-?\d{3}$/)
    .optional()
    .nullable(),
  street: z.string().max(200).optional().nullable(),
  number: z.string().max(20).optional().nullable(),
  complement: z.string().max(100).optional().nullable(),
  neighborhood: z.string().max(100).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().length(2).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
});
export type Address = z.infer<typeof AddressSchema>;

const PropertyCreateBaseSchema = z.object({
  title: z.string().min(5, "Mínimo 5 caracteres").max(120),
  type: PropertyTypeSchema,
  purpose: PropertyPurposeSchema,
  price: z.number().positive("Preço deve ser positivo").optional().nullable(),
  condoFee: z.number().min(0).optional().nullable(),
  iptu: z.number().min(0).optional().nullable(),
  rentPrice: z.number().min(0).optional().nullable(),

  areaM2: z.number().positive().optional().nullable(),
  bedrooms: z.number().int().min(0).optional().nullable(),
  suites: z.number().int().min(0).optional().nullable(),
  bathrooms: z.number().int().min(0).optional().nullable(),
  parkingSpots: z.number().int().min(0).optional().nullable(),
  floor: z.number().int().optional().nullable(),
  totalFloors: z.number().int().optional().nullable(),
  builtYear: z.number().int().min(1900).max(2030).optional().nullable(),

  amenities: z.array(AmenitySchema).default([]),

  cep: z.string().optional().nullable(),
  street: z.string().optional().nullable(),
  number: z.string().optional().nullable(),
  complement: z.string().optional().nullable(),
  neighborhood: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),

  description: z.string().max(5000).optional().nullable(),
  videoUrl: z.string().url().optional().nullable(),
  virtualTourUrl: z.string().url().optional().nullable(),

  featured: z.boolean().default(false),
  hidePrice: z.boolean().default(false),
  commissionPct: z.number().min(0).max(100).optional().nullable(),
});

export const PropertyCreateSchema = PropertyCreateBaseSchema.refine(
  (data) => {
    if (
      data.purpose === "VENDA" &&
      (data.price === null || data.price === undefined)
    ) {
      return false;
    }
    if (
      data.purpose === "ALUGUEL" &&
      (data.rentPrice === null || data.rentPrice === undefined)
    ) {
      return false;
    }
    if (
      data.purpose === "AMBOS" &&
      (data.price === null ||
        data.price === undefined ||
        data.rentPrice === null ||
        data.rentPrice === undefined)
    ) {
      return false;
    }
    return true;
  },
  {
    message:
      "Preço é obrigatório para VENDA, valor de aluguel é obrigatório para ALUGUEL, e ambos são obrigatórios para AMBOS",
    path: ["purpose"],
  },
);
export type PropertyCreate = z.infer<typeof PropertyCreateSchema>;

export const PropertyUpdateSchema = PropertyCreateBaseSchema.partial().extend({
  status: PropertyStatusSchema.optional(),
});
export type PropertyUpdate = z.infer<typeof PropertyUpdateSchema>;

export const PropertyFilterSchema = z.object({
  type: PropertyTypeSchema.optional(),
  purpose: PropertyPurposeSchema.optional(),
  status: PropertyStatusSchema.optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  neighborhood: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  minBedrooms: z.number().int().optional(),
  minArea: z.number().optional(),
  amenities: z.array(AmenitySchema).optional(),
  featured: z.boolean().optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(12),
});
export type PropertyFilter = z.infer<typeof PropertyFilterSchema>;

const PhotoSpaceMetadataSchema = z.object({
  spaceType: PhotoSpaceTypeSchema.optional().nullable(),
  spaceIndex: z.number().int().min(1).optional().nullable(),
  spaceLabel: z.string().trim().min(1).max(80).optional().nullable(),
  spaceOrder: z.number().int().min(0).default(0),
  orderInSpace: z.number().int().min(0).default(0),
});

export const PropertyPhotoCreateSchema = z
  .object({
    url: z.string().url(),
    s3Key: z.string().min(1),
    order: z.number().int().min(0).default(0),
    isCover: z.boolean().default(false),
  })
  .extend(PhotoSpaceMetadataSchema.shape);
export type PropertyPhotoCreate = z.infer<typeof PropertyPhotoCreateSchema>;

export const PropertyPhotoUpdateSchema = PhotoSpaceMetadataSchema.extend({
  isCover: z.boolean().optional(),
});
export type PropertyPhotoUpdate = z.infer<typeof PropertyPhotoUpdateSchema>;

export const PropertyPhotoMetadataItemSchema = z
  .object({
    id: z.string().min(1),
    isCover: z.boolean(),
  })
  .extend(PhotoSpaceMetadataSchema.shape);
export type PropertyPhotoMetadataItem = z.infer<
  typeof PropertyPhotoMetadataItemSchema
>;

export const PropertyPhotoBulkUpdateSchema = z.object({
  photos: z.array(PropertyPhotoMetadataItemSchema).min(1),
});
export type PropertyPhotoBulkUpdate = z.infer<
  typeof PropertyPhotoBulkUpdateSchema
>;

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  APARTAMENTO: "Apartamento",
  CASA: "Casa",
  STUDIO: "Studio",
  COBERTURA: "Cobertura",
  SOBRADO: "Sobrado",
  TERRENO: "Terreno",
  SALA_COMERCIAL: "Sala Comercial",
  GALPAO: "Galpão",
  RURAL: "Rural",
  KITNET: "Kitnet",
  LOFT: "Loft",
};

export const PROPERTY_PURPOSE_LABELS: Record<PropertyPurpose, string> = {
  VENDA: "Venda",
  ALUGUEL: "Aluguel",
  AMBOS: "Venda e Aluguel",
};

export const AMENITY_LABELS: Record<Amenity, string> = {
  piscina: "Piscina",
  churrasqueira: "Churrasqueira",
  academia: "Academia",
  playground: "Playground",
  salao_festas: "Salão de Festas",
  sauna: "Sauna",
  quadra_esportiva: "Quadra Esportiva",
  portaria_24h: "Portaria 24h",
  elevador: "Elevador",
  garagem_coberta: "Garagem Coberta",
  pet_friendly: "Pet Friendly",
  mobiliado: "Mobiliado",
  ar_condicionado: "Ar Condicionado",
  aquecimento_central: "Aquecimento Central",
  energia_solar: "Energia Solar",
  jardim: "Jardim",
  varanda: "Varanda",
  lavanderia: "Lavanderia",
  coworking: "Coworking",
  bicicletario: "Bicicletário",
  rooftop: "Rooftop",
  vista_mar: "Vista Mar",
  vista_cidade: "Vista Cidade",
  condominio_fechado: "Condomínio Fechado",
};
