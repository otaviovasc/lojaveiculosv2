export type AiStudioTemplateId =
  "industrial_garage" | "premium_studio" | "urban_scene";

export type AiStudioTemplate = {
  description: string;
  id: AiStudioTemplateId;
  label: string;
};

export type GenerateAiStudioImageInput = {
  mediaId: string;
  templateId: AiStudioTemplateId;
};

export type AiStudioGenerationResult = {
  beforeUrl: string;
  credits: number;
  generatedStorageKey: string;
  generatedUrl: string;
  guidance: number;
  mediaId: string;
  model: "flux_2_pro";
  providerGenerationId?: string | null;
  sourceStorageKey: string;
  strength: number;
  templateId: AiStudioTemplateId;
  unitId: string;
};

export type ApproveAiStudioImageInput = {
  generatedStorageKey: string;
  mediaId: string;
  templateId: AiStudioTemplateId;
};

export const aiStudioTemplates = [
  {
    description: "Showroom minimalista, piso claro e luz de softbox.",
    id: "premium_studio",
    label: "Estúdio Premium",
  },
  {
    description: "Concreto polido, luz dramática e acentos neon discretos.",
    id: "industrial_garage",
    label: "Garagem Industrial",
  },
  {
    description: "Asfalto limpo, golden hour e estética de capa de revista.",
    id: "urban_scene",
    label: "Cenário Urbano",
  },
] satisfies readonly AiStudioTemplate[];
