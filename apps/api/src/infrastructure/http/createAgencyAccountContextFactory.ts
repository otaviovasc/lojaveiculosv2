import type { Context } from "hono";
import type { CreateAppOptions } from "./createAppOptions.js";
import { createHttpAccountContext } from "./createHttpAccountContext.js";

export function createAgencyAccountContextFactory(
  options: CreateAppOptions,
  accountProvisioningServices: CreateAppOptions["accountProvisioningServices"],
) {
  return (context: Context, scope: { tenantId: string }) =>
    createHttpAccountContext(context, {
      ...(options.audit ? { audit: options.audit } : {}),
      ...(options.identityVerifier
        ? { identityVerifier: options.identityVerifier }
        : {}),
      ...(options.logger ? { logger: options.logger } : {}),
      ...(options.clerkUserProfileProvider
        ? { profileProvider: options.clerkUserProfileProvider }
        : {}),
      ...(accountProvisioningServices
        ? {
            repository:
              accountProvisioningServices.accountProvisioningRepository,
          }
        : {}),
      tenantId: scope.tenantId,
    });
}
