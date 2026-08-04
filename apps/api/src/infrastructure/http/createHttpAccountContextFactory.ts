import type { Context } from "hono";
import type { CreateAppOptions } from "./createAppOptions.js";
import { createHttpAccountContext } from "./createHttpAccountContext.js";

export function createHttpAccountContextFactory(options: CreateAppOptions) {
  return (context: Context) =>
    createHttpAccountContext(context, {
      ...(options.audit ? { audit: options.audit } : {}),
      ...(options.identityVerifier
        ? { identityVerifier: options.identityVerifier }
        : {}),
      ...(options.logger ? { logger: options.logger } : {}),
      ...(options.clerkUserProfileProvider
        ? { profileProvider: options.clerkUserProfileProvider }
        : {}),
      ...(options.accountProvisioningServices
        ? {
            repository:
              options.accountProvisioningServices.accountProvisioningRepository,
          }
        : {}),
    }).then((account) => account.serviceContext);
}
