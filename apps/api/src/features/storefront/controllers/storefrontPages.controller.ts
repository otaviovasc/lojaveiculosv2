import type { StorefrontBuilderComponent } from "@lojaveiculosv2/shared";
import { storefrontBuilderComponentTypes } from "@lojaveiculosv2/shared";
import { Hono, type Context } from "hono";
import { z } from "zod";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  createHttpServiceContext,
  HttpContextAuthenticationError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import type { StorefrontPageUpdateInput } from "../../../domains/storefront/ports/storefrontPageRepository.js";
import {
  storefrontPageServices,
  type StorefrontPageServices,
} from "./storefrontPageServices.js";
import {
  handleStorefrontPages,
  StorefrontPagesRequestValidationError,
} from "./storefrontPages.controller.errors.js";

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-zA-Z0-9À-ÿ _-]+$/);
const nullableString = z.string().trim().max(2000).nullable();
const styleRecord = z.record(z.string(), z.unknown());
const componentSchema = z.object({
  id: z.string().min(1).max(120),
  order: z.number().int().min(0).max(500),
  props: styleRecord.default({}),
  type: z
    .union([z.enum(storefrontBuilderComponentTypes), z.string().min(1).max(80)])
    .default("text_block"),
  visible: z.boolean().default(true),
});
const createPageSchema = z.object({
  description: z.string().trim().max(320).nullable().optional(),
  slug: slugSchema,
  title: z.string().trim().min(1).max(120),
});
const updatePageSchema = z.object({
  accentColor: z.string().trim().max(32).nullable().optional(),
  backgroundColor: z.string().trim().max(32).nullable().optional(),
  components: z.array(componentSchema).max(80).optional(),
  description: nullableString.optional(),
  fontFamily: z.string().trim().max(120).nullable().optional(),
  order: z.number().int().min(0).max(500).optional(),
  pageBackground: styleRecord.nullable().optional(),
  pageChrome: styleRecord.nullable().optional(),
  seo: styleRecord.nullable().optional(),
  slug: slugSchema.optional(),
  title: z.string().trim().min(1).max(120).optional(),
  visible: z.boolean().optional(),
});

export type StorefrontPagesContextFactory = (
  context: Context,
) => Promise<ServiceContext>;

export type CreateStorefrontPagesFeatureOptions = {
  contextFactory?: StorefrontPagesContextFactory;
  services?: StorefrontPageServices;
};

export function createStorefrontPagesFeature(
  options: CreateStorefrontPagesFeatureOptions = {},
) {
  const feature = new Hono();
  const services = options.services ?? storefrontPageServices;
  const contextFactory =
    options.contextFactory ?? ((context) => createHttpServiceContext(context));
  const createContext = (context: Context) =>
    createProtectedContext(context, contextFactory);

  feature.get("/pages", (context) =>
    handleStorefrontPages(context, async () => {
      const serviceContext = await createContext(context);
      const pages = await services.listPages(serviceContext);
      return context.json({ pages });
    }),
  );

  feature.post("/pages", (context) =>
    handleStorefrontPages(context, async () => {
      const input = await parseJson(context, createPageSchema);
      const serviceContext = await createContext(context);
      const page = await services.createPage(
        serviceContext,
        cleanCreateInput(input),
      );
      return context.json({ page }, 201);
    }),
  );

  feature.get("/pages/:pageId", (context) =>
    handleStorefrontPages(context, async () => {
      const serviceContext = await createContext(context);
      const page = await services.getPage(serviceContext, pageId(context));
      return context.json({ page });
    }),
  );

  feature.patch("/pages/:pageId", (context) =>
    handleStorefrontPages(context, async () => {
      const input = await parseJson(context, updatePageSchema);
      const serviceContext = await createContext(context);
      const page = await services.updatePage(
        serviceContext,
        pageId(context),
        toUpdateInput(input),
      );
      return context.json({ page });
    }),
  );

  feature.delete("/pages/:pageId", (context) =>
    handleStorefrontPages(context, async () => {
      const serviceContext = await createContext(context);
      await services.deletePage(serviceContext, pageId(context));
      return context.json({ deleted: true });
    }),
  );

  return feature;
}

async function createProtectedContext(
  context: Context,
  contextFactory: StorefrontPagesContextFactory,
): Promise<ServiceContext> {
  const serviceContext = await contextFactory(context);
  if (serviceContext.actor.kind !== "user") {
    throw new HttpContextAuthenticationError(
      "Storefront page routes require authenticated user context.",
    );
  }
  return serviceContext;
}

async function parseJson<Schema extends z.ZodType>(
  context: Context,
  schema: Schema,
): Promise<z.infer<Schema>> {
  let body: unknown;
  try {
    body = await context.req.json();
  } catch {
    throw new StorefrontPagesRequestValidationError(
      "Request body must be valid JSON.",
    );
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new StorefrontPagesRequestValidationError("Request body is invalid.");
  }
  return parsed.data;
}

function pageId(context: Context): string {
  const id = context.req.param("pageId");
  if (!id) {
    throw new StorefrontPagesRequestValidationError("Page id is required.");
  }
  return id;
}

function toUpdateInput(
  input: z.infer<typeof updatePageSchema>,
): StorefrontPageUpdateInput {
  const update = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as StorefrontPageUpdateInput;
  if (input.components !== undefined) {
    update.components = input.components as StorefrontBuilderComponent[];
  }
  return update;
}

function cleanCreateInput(input: z.infer<typeof createPageSchema>) {
  return {
    ...(input.description !== undefined
      ? { description: input.description }
      : {}),
    slug: input.slug,
    title: input.title,
  };
}
