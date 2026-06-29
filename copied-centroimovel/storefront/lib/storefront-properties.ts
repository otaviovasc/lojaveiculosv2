import type { PropertyStatus } from "@centroimovel/db";
import {
  and,
  db,
  desc,
  eq,
  or,
  properties,
  propertyAssignments,
  propertyPhotos,
  sql,
} from "@centroimovel/db";
import { getTableColumns } from "drizzle-orm";

export interface StorefrontPropertyRow {
  id: string;
  title: string;
  type: string;
  purpose: string;
  status: string;
  price: string | null;
  rentPrice: string | null;
  areaM2: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parkingSpots: number | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  description: string | null;
  amenities: unknown;
  featured: boolean;
  hidePrice: boolean;
  createdAt: Date;
  updatedAt: Date;
  captacaoStatus: string | null;
  photos: Array<{ url: string }>;
}

/**
 * Fetches storefront properties for a workspace, including BOTH:
 * - Properties owned by the workspace (properties.workspaceId)
 * - Captacao properties assigned to the workspace via PropertyAssignment with status = "APPROVED"
 *
 * Uses a single query with an EXISTS clause for the captacao assignments.
 */
export async function getStorefrontProperties(
  workspaceId: string,
  options?: {
    status?: string;
    limit?: number;
    offset?: number;
  },
): Promise<StorefrontPropertyRow[]> {
  const status = options?.status ?? "DISPONIVEL";

  return db
    .select({
      ...getTableColumns(properties),
      photos: sql<Array<{ url: string }>>`COALESCE(
        (SELECT json_agg(json_build_object('url', url) ORDER BY "order" ASC)
        FROM ${propertyPhotos}
        WHERE ${propertyPhotos.propertyId} = ${properties.id}
        AND ${propertyPhotos.isCover} = true),
        '[]'::json
      )`,
    })
    .from(properties)
    .where(
      and(
        eq(properties.status, status as PropertyStatus),
        or(
          eq(properties.workspaceId, workspaceId),
          sql`EXISTS (
            SELECT 1
            FROM ${propertyAssignments}
            WHERE ${propertyAssignments.propertyId} = ${properties.id}
            AND ${propertyAssignments.workspaceId} = ${workspaceId}
            AND ${propertyAssignments.status} = 'APPROVED'
          )`,
        ),
      ),
    )
    .orderBy(desc(properties.featured), desc(properties.createdAt))
    .limit(options?.limit ?? 20)
    .offset(options?.offset ?? 0) as unknown as StorefrontPropertyRow[];
}
