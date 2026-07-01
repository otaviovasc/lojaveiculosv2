import type { AuditSink } from "@lojaveiculosv2/audit";
import type { Context, Hono } from "hono";
import { createAccountProvisioningFeature } from "../../features/identity/controllers/accountProvisioning.controller.js";
import type { AccountProvisioningServices } from "../../features/identity/controllers/accountProvisioningServices.js";
import type { ServiceContext } from "../../shared/serviceContext.js";
import type { ClerkUserProfileProvider } from "../auth/clerkAccountProvisioning.js";
import { createHttpAccountContext } from "./createHttpAccountContext.js";
import type { HttpIdentityVerifier } from "./httpIdentityVerifier.js";

export function installAccountProvisioningRoutes(
  app: Hono,
  options: {
    accountProvisioningServices?: AccountProvisioningServices;
    audit?: AuditSink;
    clerkUserProfileProvider?: ClerkUserProfileProvider;
    identityVerifier?: HttpIdentityVerifier;
  },
  storeContextFactory: (context: Context) => Promise<ServiceContext>,
) {
  if (!options.accountProvisioningServices) return;
  const services = options.accountProvisioningServices;
  app.route(
    "/api/v1",
    createAccountProvisioningFeature({
      accountContextFactory: (context, scope) =>
        createHttpAccountContext(context, {
          ...(options.audit ? { audit: options.audit } : {}),
          ...(options.identityVerifier
            ? { identityVerifier: options.identityVerifier }
            : {}),
          ...(options.clerkUserProfileProvider
            ? { profileProvider: options.clerkUserProfileProvider }
            : {}),
          repository: services.accountProvisioningRepository,
          ...(scope?.tenantId ? { tenantId: scope.tenantId } : {}),
        }),
      services,
      storeContextFactory,
    }),
  );
}
