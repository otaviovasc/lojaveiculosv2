import { z } from "zod";

export const PortalSubmissionStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
]);
export type PortalSubmissionStatus = z.infer<
  typeof PortalSubmissionStatusSchema
>;

export const PortalPropertyFilterSchema = z.object({
  city: z.string().optional(),
  state: z.string().optional(),
  neighborhood: z.string().optional(),
  type: z.string().optional(),
  purpose: z.enum(["VENDA", "ALUGUEL", "AMBOS", "ALL"]).optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  minBedrooms: z.number().optional(),
  minBathrooms: z.number().optional(),
  minArea: z.number().optional(),
  minParking: z.number().optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  sortBy: z
    .enum(["relevance", "price_asc", "price_desc", "area_desc", "newest"])
    .default("relevance"),
  nearLat: z.number().optional(),
  nearLng: z.number().optional(),
  nearRadiusKm: z.number().optional(),
});
export type PortalPropertyFilter = z.infer<typeof PortalPropertyFilterSchema>;

export const SubmitToPortalSchema = z.object({
  propertyId: z.string(),
});
export type SubmitToPortal = z.infer<typeof SubmitToPortalSchema>;

export const ReviewPortalSubmissionSchema = z.object({
  submissionId: z.string(),
  status: z.enum(["APPROVED", "REJECTED"]),
  rejectionReason: z.string().max(500).optional(),
});
export type ReviewPortalSubmission = z.infer<
  typeof ReviewPortalSubmissionSchema
>;

export const CreatePortalLeadSchema = z.object({
  propertyId: z.string(),
  name: z.string().min(2).max(200),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(8).max(20),
  message: z.string().max(2000).optional(),
  visitorId: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
});
export type CreatePortalLead = z.infer<typeof CreatePortalLeadSchema>;

export interface PortalProperty {
  id: string;
  title: string;
  type: string;
  purpose: string;
  price: number;
  rentPrice: number | null;
  condoFee: number | null;
  iptu: number | null;
  areaM2: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parkingSpots: number | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  description: string | null;
  coverPhotoUrl: string | null;
  photos: Array<{ id: string; url: string; isCover: boolean; order: number }>;
  amenities: string[];
  featured: boolean;
  hidePrice: boolean;
  workspace: {
    id: string;
    name: string;
    slug: string;
    corretorName: string | null;
    whatsappNumber: string | null;
    customDomain: string | null;
    domainStatus: string | null;
  };
}

export interface PortalListingsResult {
  properties: PortalProperty[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
