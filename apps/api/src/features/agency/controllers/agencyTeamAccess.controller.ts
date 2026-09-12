import { Hono } from "hono";
import type { PermissionKey, TenantId } from "@lojaveiculosv2/shared";
import { createHttpAccountContext } from "../../../infrastructure/http/createHttpAccountContext.js";
import { createAgencyServiceContext } from "./agency.controller.support.js";
import type { AgencyAccountContextFactory } from "./agency.controller.support.js";
import type { AgencyTeamAccessServices } from "./agencyTeamAccessServices.js";
import {
  agencyTeamAccessInvitationParamsSchema,
  agencyTeamAccessMembershipParamsSchema,
  agencyTeamAccessStoreParamsSchema,
  agencyTeamAccessTenantParamsSchema,
} from "./agencyTeamAccess.controller.schemas.js";
import {
  handleAgencyTeamAccess,
  parseAgencyTeamAccessJson,
  parseAgencyTeamAccessParams,
  resolveAgencyTeamAccessStoreContext,
} from "./agencyTeamAccess.controller.support.js";
import { inviteStoreMemberSchema } from "../../identity/controllers/accountProvisioning.controller.schemas.js";
import { updateMembershipAccessSchema } from "../../identity/controllers/roles.controller.schemas.js";

export type CreateAgencyTeamAccessFeatureOptions = {
  accountContextFactory?: AgencyAccountContextFactory;
  services: AgencyTeamAccessServices;
};

export function createAgencyTeamAccessFeature(
  options: CreateAgencyTeamAccessFeatureOptions,
) {
  const feature = new Hono();
  const services = options.services;
  const accountContextFactory =
    options.accountContextFactory ??
    ((context, scope) =>
      createHttpAccountContext(context, { tenantId: scope.tenantId }));

  feature.get("/tenants/:tenantId/team-access", async (context) =>
    handleAgencyTeamAccess(context, async () => {
      const { tenantId } = parseAgencyTeamAccessParams(
        context,
        agencyTeamAccessTenantParamsSchema,
      );
      const account = await accountContextFactory(context, {
        tenantId: tenantId as TenantId,
      });
      const serviceContext = createAgencyServiceContext(
        account,
        tenantId as TenantId,
      );
      return context.json(await services.listStores(serviceContext, services));
    }),
  );

  feature.get(
    "/tenants/:tenantId/stores/:storeId/team-access",
    async (context) =>
      handleAgencyTeamAccess(context, async () => {
        const params = parseAgencyTeamAccessParams(
          context,
          agencyTeamAccessStoreParamsSchema,
        );
        const { serviceContext } = await createStoreRequestContext(
          context,
          params,
          accountContextFactory,
          services,
        );
        return context.json(
          await services.roleServices.listRoleManagement(
            serviceContext,
            services.roleServices,
          ),
        );
      }),
  );

  feature.patch(
    "/tenants/:tenantId/stores/:storeId/team-access/memberships/:membershipId",
    async (context) =>
      handleAgencyTeamAccess(context, async () => {
        const params = parseAgencyTeamAccessParams(
          context,
          agencyTeamAccessMembershipParamsSchema,
        );
        const input = await parseAgencyTeamAccessJson(
          context,
          updateMembershipAccessSchema,
        );
        const { serviceContext } = await createStoreRequestContext(
          context,
          params,
          accountContextFactory,
          services,
        );
        return context.json(
          await services.roleServices.updateMembershipAccess(
            serviceContext,
            {
              membershipId: params.membershipId,
              overrides: input.overrides.map((override) => ({
                allowed: override.allowed,
                permission: override.permission as PermissionKey,
                reason: override.reason ?? null,
              })),
              role: input.role,
            },
            services.roleServices,
          ),
        );
      }),
  );

  feature.post(
    "/tenants/:tenantId/stores/:storeId/team-access/invitations",
    async (context) =>
      handleAgencyTeamAccess(context, async () => {
        const params = parseAgencyTeamAccessParams(
          context,
          agencyTeamAccessStoreParamsSchema,
        );
        const input = await parseAgencyTeamAccessJson(
          context,
          inviteStoreMemberSchema,
        );
        const { serviceContext } = await createStoreRequestContext(
          context,
          params,
          accountContextFactory,
          services,
        );
        const invitation = await services.accountServices.inviteStoreMember(
          serviceContext,
          {
            email: input.email,
            ...(input.name ? { name: input.name } : {}),
            role: input.role,
          },
          services.accountServices,
        );
        return context.json(invitation, 201);
      }),
  );

  feature.post(
    "/tenants/:tenantId/stores/:storeId/team-access/invitations/:invitationId/resend",
    async (context) =>
      handleAgencyTeamAccess(context, async () => {
        const params = parseAgencyTeamAccessParams(
          context,
          agencyTeamAccessInvitationParamsSchema,
        );
        const { account, serviceContext } = await createStoreRequestContext(
          context,
          params,
          accountContextFactory,
          services,
        );
        return context.json(
          await services.accountServices.resendInvitation(
            serviceContext,
            account.profile,
            { invitationId: params.invitationId },
            services.accountServices,
          ),
        );
      }),
  );

  return feature;
}

async function createStoreRequestContext(
  context: Parameters<AgencyAccountContextFactory>[0],
  params: { storeId: string; tenantId: string },
  accountContextFactory: AgencyAccountContextFactory,
  services: AgencyTeamAccessServices,
) {
  const tenantId = params.tenantId as TenantId;
  const account = await accountContextFactory(context, { tenantId });
  const agencyContext = createAgencyServiceContext(account, tenantId);
  const serviceContext = await resolveAgencyTeamAccessStoreContext(
    agencyContext,
    params.storeId,
    services,
  );
  return { account, serviceContext };
}
