import type { AuditSink } from "@lojaveiculosv2/audit";
import type { Context } from "hono";
import { z } from "zod";
import type { CrmRepository } from "../../../domains/crm/ports/crmRepository.js";
import type { PublicStorefrontLeadSink } from "../../../domains/storefront/ports/publicStorefrontLeadSink.js";
import type { PublicStorefrontRepository } from "../../../domains/storefront/ports/publicStorefrontRepository.js";
import type { StorefrontPageRepository } from "../../../domains/storefront/ports/storefrontPageRepository.js";
import { createPublicStorefrontLead } from "../../../domains/storefront/services/StorefrontService/createPublicStorefrontLead.js";
import { createPublicStorefrontPageLead } from "../../../domains/storefront/services/StorefrontService/createPublicStorefrontPageLead.js";
import { createPlaceholderServiceContext } from "../../../infrastructure/http/createPlaceholderServiceContext.js";
import { resolveStoreSlugFromRequest } from "../../../infrastructure/http/storeScope.js";
import {
  rateLimitPublicLeadRequest,
  type PublicLeadRateLimiter,
} from "../adapters/rateLimiter/publicLeadRateLimiter.js";
import { StorefrontRequestValidationError } from "./storefrontErrors.js";

const createLeadSchema = z.object({
  buyerEmail: z.string().trim().email().optional().or(z.literal("")),
  buyerName: z.string().trim().min(1).max(191),
  buyerPhone: z.string().trim().min(3).max(40).optional().or(z.literal("")),
  message: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function handleCreatePublicStorefrontLead(
  context: Context,
  options: {
    audit?: AuditSink;
    crmRepository: CrmRepository;
    leadRateLimiter: PublicLeadRateLimiter;
    repository: PublicStorefrontRepository;
    leadSink?: PublicStorefrontLeadSink;
  },
): Promise<Response> {
  const storeSlug = resolveStoreSlugFromRequest(context);
  const listingSlug = context.req.param("listingSlug");

  if (!storeSlug) {
    return context.json({ message: "Store subdomain is required." }, 400);
  }
  if (!listingSlug) {
    return context.json({ message: "Listing slug is required." }, 400);
  }

  const rateLimitResponse = rateLimitPublicLeadRequest(
    context,
    options.leadRateLimiter,
    { listingSlug, storeSlug },
  );
  if (rateLimitResponse) return rateLimitResponse;

  const body = await parseJson(context, createLeadSchema);
  const serviceContext = createPlaceholderServiceContext(
    context,
    options.audit ? { audit: options.audit } : {},
  );
  const result = await createPublicStorefrontLead(
    serviceContext,
    {
      buyerEmail: normalizeOptionalText(body.buyerEmail),
      buyerName: body.buyerName,
      buyerPhone: normalizeOptionalText(body.buyerPhone),
      listingSlug,
      message: normalizeOptionalText(body.message),
      storeSlug,
    },
    {
      leadSink: options.leadSink ?? createCrmLeadSink(options.crmRepository),
      storefrontRepository: options.repository,
    },
  );

  return context.json(result, result.deduplicated ? 200 : 201);
}

export async function handleCreatePublicStorefrontPageLead(
  context: Context,
  options: {
    audit?: AuditSink;
    crmRepository: CrmRepository;
    leadRateLimiter: PublicLeadRateLimiter;
    pageRepository: StorefrontPageRepository;
    leadSink?: PublicStorefrontLeadSink;
  },
): Promise<Response> {
  const storeSlug = resolveStoreSlugFromRequest(context);
  const pageSlug = context.req.param("pageSlug");

  if (!storeSlug) {
    return context.json({ message: "Store subdomain is required." }, 400);
  }
  if (!pageSlug) {
    return context.json({ message: "Page slug is required." }, 400);
  }

  const rateLimitResponse = rateLimitPublicLeadRequest(
    context,
    options.leadRateLimiter,
    { listingSlug: `page:${pageSlug}`, storeSlug },
  );
  if (rateLimitResponse) return rateLimitResponse;

  const body = await parseJson(context, createLeadSchema);
  const serviceContext = createPlaceholderServiceContext(
    context,
    options.audit ? { audit: options.audit } : {},
  );
  const result = await createPublicStorefrontPageLead(
    serviceContext,
    {
      buyerEmail: normalizeOptionalText(body.buyerEmail),
      buyerName: body.buyerName,
      buyerPhone: normalizeOptionalText(body.buyerPhone),
      message: normalizeOptionalText(body.message),
      pageSlug,
      storeSlug,
    },
    {
      leadSink: options.leadSink ?? createCrmLeadSink(options.crmRepository),
      pageRepository: options.pageRepository,
    },
  );

  return context.json(result, result.deduplicated ? 200 : 201);
}

function createCrmLeadSink(
  repository: CrmRepository,
): PublicStorefrontLeadSink {
  return {
    createLead: async (input) =>
      toPublicLead(await repository.createLead(input)),
    listLeads: async (input) =>
      (await repository.listLeads(input))
        .filter((lead) => lead.source === "public_site")
        .map(toPublicLead),
  };
}

function toPublicLead(lead: Awaited<ReturnType<CrmRepository["createLead"]>>) {
  return {
    buyerEmail: lead.buyerEmail,
    buyerPhone: lead.buyerPhone,
    createdAt: lead.createdAt,
    id: lead.id,
    listingId: lead.listingId,
    source: "public_site" as const,
    status: lead.status,
  };
}

async function parseJson<Schema extends z.ZodType>(
  context: Context,
  schema: Schema,
): Promise<z.infer<Schema>> {
  let body: unknown;

  try {
    body = await context.req.json();
  } catch {
    throw new StorefrontRequestValidationError(
      "Request body must be valid JSON.",
    );
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new StorefrontRequestValidationError("Request body is invalid.");
  }

  return parsed.data;
}

function normalizeOptionalText(value?: string | null) {
  return value && value.length > 0 ? value : null;
}
