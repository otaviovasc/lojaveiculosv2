import type {
  StorefrontBuilderComponent,
  StorefrontBuilderConfig,
  StorefrontBuilderVehicle,
  StorefrontCustomPage,
  StoreId,
  TenantId,
} from "@lojaveiculosv2/shared";
import type {
  PublicStorefrontContact,
  PublicStorefrontPublicStore,
} from "./publicStorefrontRepository.js";

export type StorefrontPageScope = {
  storeId: StoreId;
  tenantId: TenantId;
};

export type StorefrontPageCreateInput = {
  description?: string | null;
  slug: string;
  title: string;
};

export type StorefrontPageUpdateInput = Partial<
  Pick<
    StorefrontCustomPage,
    | "accentColor"
    | "backgroundColor"
    | "components"
    | "description"
    | "fontFamily"
    | "pageBackground"
    | "pageChrome"
    | "seo"
    | "slug"
    | "title"
    | "visible"
  >
> & {
  order?: number;
};

export type PublicStorefrontCustomPageSnapshot = {
  config: StorefrontBuilderConfig;
  contact: PublicStorefrontContact;
  page: StorefrontCustomPage;
  sourceListingId?: string | null;
  sitePublished: boolean;
  store: PublicStorefrontPublicStore & {
    id: StoreId;
    tenantId: TenantId;
  };
  vehicles: readonly StorefrontBuilderVehicle[];
};

export type VehicleVitrinePageWrite = {
  components: StorefrontBuilderComponent[];
  description: string;
  listingId: string;
  slug: string;
  title: string;
  visible: boolean;
};

export type StorefrontPageRepository = {
  createOrReuseVehicleVitrine?: (
    scope: StorefrontPageScope,
    input: VehicleVitrinePageWrite,
  ) => Promise<StorefrontCustomPage>;
  createCustomPage: (
    scope: StorefrontPageScope,
    input: StorefrontPageCreateInput & {
      order: number;
      secretToken: string;
    },
  ) => Promise<StorefrontCustomPage>;
  deleteCustomPage: (
    scope: StorefrontPageScope & { pageId: string },
  ) => Promise<boolean>;
  findCustomPageById: (
    scope: StorefrontPageScope & { pageId: string },
  ) => Promise<StorefrontCustomPage | null>;
  findPublicCustomPageBySlug: (input: {
    pageSlug: string;
    storeSlug: string;
  }) => Promise<PublicStorefrontCustomPageSnapshot | null>;
  listCustomPages: (
    scope: StorefrontPageScope,
  ) => Promise<readonly StorefrontCustomPage[]>;
  updateCustomPage: (
    scope: StorefrontPageScope & { pageId: string },
    input: StorefrontPageUpdateInput,
  ) => Promise<StorefrontCustomPage | null>;
};
