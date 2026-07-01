import { Hono, type Context } from "hono";
import {
  createHttpAccountContext,
  type HttpAccountContext,
} from "../../../infrastructure/http/createHttpAccountContext.js";
import {
  createHttpServiceContext,
  HttpContextAuthenticationError,
} from "../../../infrastructure/http/createHttpServiceContext.js";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import {
  createAgencySchema,
  createAgencyStoreSchema,
  createOwnerStoreSchema,
  inviteStoreMemberSchema,
  resendInvitationParamsSchema,
} from "./accountProvisioning.controller.schemas.js";
import {
  cleanProfile,
  handleProvisioning,
  parseJson,
  parseParams,
} from "./accountProvisioning.controller.support.js";
import type { AccountProvisioningServices } from "./accountProvisioningServices.js";

export type AccountContextFactory = (
  context: Context,
  scope?: { tenantId?: string },
) => Promise<HttpAccountContext>;
export type StoreContextFactory = (context: Context) => Promise<ServiceContext>;

export type CreateAccountProvisioningFeatureOptions = {
  accountContextFactory?: AccountContextFactory;
  services: AccountProvisioningServices;
  storeContextFactory?: StoreContextFactory;
};

export function createAccountProvisioningFeature(
  options: CreateAccountProvisioningFeatureOptions,
) {
  const feature = new Hono();
  const services = options.services;
  const accountContextFactory =
    options.accountContextFactory ??
    ((context) => createHttpAccountContext(context));
  const storeContextFactory =
    options.storeContextFactory ??
    ((context) => createHttpServiceContext(context));

  feature.get("/session/bootstrap", async (context) =>
    handleProvisioning(context, async () => {
      const account = await accountContextFactory(context);
      return context.json(
        await services.bootstrapSession(
          account.serviceContext,
          account.profile,
          services,
        ),
      );
    }),
  );

  feature.post("/onboarding/owner-store", async (context) =>
    handleProvisioning(context, async () => {
      const input = await parseJson(context, createOwnerStoreSchema);
      const account = await accountContextFactory(context);
      const result = await services.createOwnerStore(
        account.serviceContext,
        account.profile,
        {
          ...(input.profile ? { profile: cleanProfile(input.profile) } : {}),
          publicSlug: input.publicSlug,
          ...(input.storeLegalName
            ? { storeLegalName: input.storeLegalName }
            : {}),
          storeTradingName: input.storeTradingName,
          ...(input.tenantLegalName
            ? { tenantLegalName: input.tenantLegalName }
            : {}),
          ...(input.tenantTradingName
            ? { tenantTradingName: input.tenantTradingName }
            : {}),
        },
        services,
      );
      return context.json(result, 201);
    }),
  );

  feature.post("/admin/agencies", async (context) =>
    handleProvisioning(context, async () => {
      const input = await parseJson(context, createAgencySchema);
      const account = await accountContextFactory(context);
      const result = await services.createAgency(
        account.serviceContext,
        account.profile,
        {
          ...(input.firstUser
            ? {
                firstUser: {
                  email: input.firstUser.email,
                  ...(input.firstUser.name
                    ? { name: input.firstUser.name }
                    : {}),
                },
              }
            : {}),
          ...(input.tenantLegalName
            ? { tenantLegalName: input.tenantLegalName }
            : {}),
          tenantSlug: input.tenantSlug,
          tenantTradingName: input.tenantTradingName,
        },
        services,
      );
      return context.json(result, 201);
    }),
  );

  feature.post("/agency/stores", async (context) =>
    handleProvisioning(context, async () => {
      const input = await parseJson(context, createAgencyStoreSchema);
      const account = await accountContextFactory(context, {
        tenantId: input.tenantId,
      });
      const result = await services.createAgencyStore(
        account.serviceContext,
        account.profile,
        {
          ...(input.profile ? { profile: cleanProfile(input.profile) } : {}),
          publicSlug: input.publicSlug,
          ...(input.storeLegalName
            ? { storeLegalName: input.storeLegalName }
            : {}),
          storeTradingName: input.storeTradingName,
          tenantId: input.tenantId,
        },
        services,
      );
      return context.json(result, 201);
    }),
  );

  feature.post("/identity/invitations", async (context) =>
    handleProvisioning(context, async () => {
      const input = await parseJson(context, inviteStoreMemberSchema);
      const serviceContext = await createProtectedStoreContext(
        context,
        storeContextFactory,
      );
      const result = await services.inviteStoreMember(
        serviceContext,
        {
          email: input.email,
          ...(input.name ? { name: input.name } : {}),
          role: input.role,
        },
        services,
      );
      return context.json(result, 201);
    }),
  );

  feature.post("/identity/invitations/:invitationId/resend", async (context) =>
    handleProvisioning(context, async () => {
      const input = parseParams(context, resendInvitationParamsSchema);
      const account = await accountContextFactory(context);
      const result = await services.resendInvitation(
        account.serviceContext,
        account.profile,
        input,
        services,
      );
      return context.json(result);
    }),
  );

  return feature;
}

async function createProtectedStoreContext(
  context: Context,
  storeContextFactory: StoreContextFactory,
) {
  const serviceContext = await storeContextFactory(context);
  if (serviceContext.actor.kind !== "user") {
    throw new HttpContextAuthenticationError(
      "Identity invitations require authenticated user context.",
    );
  }
  return serviceContext;
}
