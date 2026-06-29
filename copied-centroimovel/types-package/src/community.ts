import { z } from "zod";

export const CommunityCategorySchema = z.enum([
  "GERAL",
  "CAPTACAO",
  "VENDAS",
  "LOCACAO",
  "MERCADO",
  "JURIDICO",
  "BOAS_PRATICAS",
]);
export type CommunityCategory = z.infer<typeof CommunityCategorySchema>;

export const CommunityTargetTypeSchema = z.enum([
  "POST",
  "COMMENT",
  "CHANNEL_MESSAGE",
]);
export type CommunityTargetType = z.infer<typeof CommunityTargetTypeSchema>;

export const CommunityPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
export type CommunityPagination = z.infer<typeof CommunityPaginationSchema>;

export const CommunityPostsQuerySchema = CommunityPaginationSchema.extend({
  category: CommunityCategorySchema.optional(),
});
export type CommunityPostsQuery = z.infer<typeof CommunityPostsQuerySchema>;

export const CommunityMessagesQuerySchema = CommunityPaginationSchema.extend({
  replyToMessageId: z.string().optional().nullable(),
});
export type CommunityMessagesQuery = z.infer<
  typeof CommunityMessagesQuerySchema
>;

export const CommunityCommentsQuerySchema = CommunityPaginationSchema.extend({
  parentCommentId: z.string().optional().nullable(),
});
export type CommunityCommentsQuery = z.infer<
  typeof CommunityCommentsQuerySchema
>;

export const CommunityCreateMessageSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  replyToMessageId: z.string().optional().nullable(),
});
export type CommunityCreateMessage = z.infer<
  typeof CommunityCreateMessageSchema
>;

export const CommunityUpdateMessageSchema = z.object({
  body: z.string().trim().min(1).max(2000),
});
export type CommunityUpdateMessage = z.infer<
  typeof CommunityUpdateMessageSchema
>;

export const CommunityCreatePostSchema = z.object({
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(1).max(10000),
  category: CommunityCategorySchema.optional().nullable(),
});
export type CommunityCreatePost = z.infer<typeof CommunityCreatePostSchema>;

export const CommunityUpdatePostSchema = z.object({
  title: z.string().trim().min(3).max(120).optional(),
  body: z.string().trim().min(1).max(10000).optional(),
  category: CommunityCategorySchema.optional().nullable(),
});
export type CommunityUpdatePost = z.infer<typeof CommunityUpdatePostSchema>;

export const CommunityCreateCommentSchema = z.object({
  body: z.string().trim().min(1).max(4000),
  parentCommentId: z.string().optional().nullable(),
});
export type CommunityCreateComment = z.infer<
  typeof CommunityCreateCommentSchema
>;

export const CommunityUpdateCommentSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});
export type CommunityUpdateComment = z.infer<
  typeof CommunityUpdateCommentSchema
>;

export const CommunityReactionTargetSchema = z.object({
  targetType: CommunityTargetTypeSchema,
  targetId: z.string(),
});
export type CommunityReactionTarget = z.infer<
  typeof CommunityReactionTargetSchema
>;

export const COMMUNITY_CATEGORY_LABELS: Record<CommunityCategory, string> = {
  GERAL: "Geral",
  CAPTACAO: "Captação",
  VENDAS: "Vendas",
  LOCACAO: "Locação",
  MERCADO: "Bairros e mercado",
  JURIDICO: "Jurídico",
  BOAS_PRATICAS: "Boas práticas",
};
