import { Hono, type Context } from "hono";
import { z } from "zod";
import { AgencyStatsStoreNotFoundError } from "../../../domains/agency/ports/agencyStatsRepository.js";
import { AgencyStatsScopeError } from "../../../domains/agency/services/AgencyStatsService/serviceSupport.js";
import {
  apiErrorInput,
  handleControllerAction,
} from "../../../infrastructure/http/commonApiErrorResponse.js";
import type { TenantId } from "@lojaveiculosv2/shared";
import {
  createAgencyContext,
  type AgencyAccountContextFactory,
} from "./agency.controller.support.js";
import type { AgencyStatsServices } from "./agencyStatsServices.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const querySchema = z.object({
  from: z.string().date().optional(),
  storeId: z.string().uuid().optional(),
  to: z.string().date().optional(),
});
const paramsSchema = z.object({ tenantId: z.string().uuid() });

export function createAgencyStatsFeature(options: {
  accountContextFactory: AgencyAccountContextFactory;
  services: AgencyStatsServices;
}) {
  const feature = new Hono();

  feature.get("/tenants/:tenantId/stats", async (context) =>
    handleControllerAction(
      context,
      async () => {
        const tenantId = parseTenantId(context);
        const input = parseQuery(context);
        const serviceContext = await createAgencyContext(
          context,
          options.accountContextFactory,
          tenantId,
        );
        return context.json(
          await options.services.getStats(serviceContext, input),
        );
      },
      mapAgencyStatsError,
    ),
  );

  return feature;
}

function parseTenantId(context: Context): TenantId {
  const result = paramsSchema.safeParse(context.req.param());
  if (!result.success) throw new AgencyStatsRequestValidationError();
  return result.data.tenantId as TenantId;
}

function parseQuery(context: Context) {
  const result = querySchema.safeParse({
    from: context.req.query("from"),
    storeId: context.req.query("storeId"),
    to: context.req.query("to"),
  });
  if (!result.success) throw new AgencyStatsRequestValidationError();
  const { from, storeId, to } = result.data;
  if (Boolean(from) !== Boolean(to))
    throw new AgencyStatsRequestValidationError();
  const period = from && to ? { from, to } : defaultPeriod();
  if (period.from > period.to) throw new AgencyStatsRequestValidationError();
  return { period, ...(storeId ? { storeId } : {}) };
}

function defaultPeriod(now: Date = new Date()) {
  const end = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  return {
    from: new Date(end - 29 * DAY_MS).toISOString().slice(0, 10),
    to: new Date(end).toISOString().slice(0, 10),
  };
}

function mapAgencyStatsError(error: unknown) {
  if (error instanceof AgencyStatsRequestValidationError) {
    return apiErrorInput(error, "AGENCY_STATS_REQUEST_INVALID", 400);
  }
  if (error instanceof AgencyStatsScopeError) {
    return apiErrorInput(error, "AGENCY_STATS_SCOPE_INVALID", 400);
  }
  if (error instanceof AgencyStatsStoreNotFoundError) {
    return apiErrorInput(error, "AGENCY_STATS_STORE_NOT_FOUND", 404);
  }
  return null;
}

class AgencyStatsRequestValidationError extends Error {
  constructor() {
    super("Use a valid tenant, store and complete date range.");
    this.name = "AgencyStatsRequestValidationError";
  }
}
