import type { StorefrontCustomPage } from "@lojaveiculosv2/shared";
import type { SettingsAuth } from "../settings/types";
export { createDefaultPageComponent } from "./builderBlockCatalog";

export type StorefrontPageCreatePayload = {
  description?: string | null;
  slug: string;
  title: string;
};

export type StorefrontPageUpdatePayload = Partial<
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

export type StorefrontPagesApi = {
  createPage: (
    input: StorefrontPageCreatePayload,
  ) => Promise<StorefrontCustomPage>;
  deletePage: (pageId: string) => Promise<void>;
  getPage: (pageId: string) => Promise<StorefrontCustomPage>;
  listPages: () => Promise<readonly StorefrontCustomPage[]>;
  updatePage: (
    pageId: string,
    input: StorefrontPageUpdatePayload,
  ) => Promise<StorefrontCustomPage>;
};

export type CreateStorefrontPagesApiOptions = {
  auth?: SettingsAuth;
  baseUrl?: string;
  fetch: typeof fetch;
};

export function createStorefrontPagesApi({
  auth = {},
  baseUrl,
  fetch,
}: CreateStorefrontPagesApiOptions): StorefrontPagesApi {
  return {
    createPage: (input) =>
      fetch(storefrontPagesRoutes.pages(baseUrl), {
        body: JSON.stringify(cleanJson(input)),
        headers: createHeaders(auth),
        method: "POST",
      })
        .then(readJson<{ page: StorefrontCustomPage }>)
        .then((data) => data.page),
    deletePage: (pageId) =>
      fetch(storefrontPagesRoutes.page(pageId, baseUrl), {
        headers: createHeaders(auth),
        method: "DELETE",
      }).then(async (response) => {
        await readJson<{ deleted: boolean }>(response);
      }),
    getPage: (pageId) =>
      fetch(storefrontPagesRoutes.page(pageId, baseUrl), {
        headers: createHeaders(auth),
      })
        .then(readJson<{ page: StorefrontCustomPage }>)
        .then((data) => data.page),
    listPages: () =>
      fetch(storefrontPagesRoutes.pages(baseUrl), {
        headers: createHeaders(auth),
      })
        .then(readJson<{ pages: readonly StorefrontCustomPage[] }>)
        .then((data) => data.pages),
    updatePage: (pageId, input) =>
      fetch(storefrontPagesRoutes.page(pageId, baseUrl), {
        body: JSON.stringify(cleanJson(input)),
        headers: createHeaders(auth),
        method: "PATCH",
      })
        .then(readJson<{ page: StorefrontCustomPage }>)
        .then((data) => data.page),
  };
}

export const storefrontPagesRoutes = {
  page: (pageId: string, baseUrl?: string) =>
    createEndpoint(`/storefront/pages/${encodeURIComponent(pageId)}`, baseUrl),
  pages: (baseUrl?: string) => createEndpoint("/storefront/pages", baseUrl),
} as const;

function createHeaders(auth: SettingsAuth): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (auth.accessToken) headers.Authorization = `Bearer ${auth.accessToken}`;
  if (auth.clerkUserId) headers["x-clerk-user-id"] = auth.clerkUserId;
  if (auth.storeSlug) headers["x-store-slug"] = auth.storeSlug;
  return headers;
}

function createEndpoint(path: string, baseUrl = "/api/v1") {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Storefront pages request failed with ${response.status}`);
  }
  return (await response.json()) as T;
}

function cleanJson(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  );
}
