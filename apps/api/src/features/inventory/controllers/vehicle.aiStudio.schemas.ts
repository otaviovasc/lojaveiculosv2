import { z } from "zod";

const aiStudioTemplateSchema = z.enum([
  "premium_studio",
  "industrial_garage",
  "urban_scene",
]);

export const aiStudioGenerationSchema = z.object({
  mediaId: z.string().trim().min(1),
  templateId: aiStudioTemplateSchema,
});

export const aiStudioApprovalSchema = z.object({
  generatedStorageKey: z.string().trim().min(1),
  mediaId: z.string().trim().min(1),
  templateId: aiStudioTemplateSchema,
});
