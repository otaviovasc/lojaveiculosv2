import type { StoreId, TenantId } from "@lojaveiculosv2/shared";

export type PublicStorefrontLead = {
  buyerEmail: string | null;
  buyerPhone: string | null;
  createdAt: Date;
  id: string;
  listingId: string | null;
  source: "public_site";
  status: string;
};

export type PublicStorefrontLeadSink = {
  createLead: (input: {
    buyerEmail: string | null;
    buyerName: string;
    buyerPhone: string | null;
    listingId: string | null;
    metadata: Record<string, unknown>;
    source: "public_site";
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<PublicStorefrontLead>;
  listLeads: (input: {
    limit: number;
    search: string;
    storeId: StoreId;
    tenantId: TenantId;
  }) => Promise<readonly PublicStorefrontLead[]>;
};
