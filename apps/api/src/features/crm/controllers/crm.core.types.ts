import type { Context, Hono } from "hono";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import type { CrmCoreRepository } from "../../../domains/crm/ports/crmCoreRepository.js";

export type CrmCoreRouteDependencies = {
  createContext: (context: Context) => Promise<ServiceContext>;
  handleCrm: (
    context: Context,
    action: () => Promise<Response>,
  ) => Promise<Response>;
  repository: CrmCoreRepository;
};

export type CrmCoreRouter = Hono;
