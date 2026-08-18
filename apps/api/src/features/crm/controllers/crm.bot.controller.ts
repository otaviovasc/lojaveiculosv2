import type { Context, Hono } from "hono";
import {
  crmExternalBotActionAcceptedResultSchema,
  crmExternalBotConfigurationPatchSchema,
  crmExternalBotProposalDecisionInputSchema,
  crmExternalBotProposalDecisionResultSchema,
  crmExternalBotTestInputSchema,
  crmExternalBotTestResultSchema,
} from "@lojaveiculosv2/shared";
import type { ServiceContext } from "../../../shared/serviceContext.js";
import { botError } from "../../../domains/crm/bot/externalBotErrors.js";
import type { ExternalBotManagerPorts } from "../../../domains/crm/bot/ports/externalBotPorts.js";
import type { CrmServices } from "./crmServices.js";
import type { UpdateExternalBotIntegrationInput } from "../../../domains/crm/services/CrmExternalBotService/externalBotIntegration.js";
import { executeExternalBotAction } from "../../../domains/crm/bot/services/ExternalBotManagerService/executeExternalBotAction.js";
import { decideExternalBotProposal } from "../../../domains/crm/bot/services/ExternalBotManagerService/decideExternalBotProposal.js";
import { externalBotActionSchema } from "./crm.bot.schemas.js";
import {
  assertExternalBotManage,
  assertExternalBotProposalDecide,
  assertExternalBotRead,
} from "./crm.messaging.controller.support.js";
import {
  bearerCredential,
  createBotActionContext,
  handleExternalBot,
  parseBody,
  readProviderOperationId,
  requireManager,
  toExternalBotConfigurationRead,
} from "./crm.bot.controllerSupport.js";

export type RegisterExternalBotRoutesOptions = {
  createContext: (context: Context) => Promise<ServiceContext>;
  createWebhookContext: (context: Context) => Promise<ServiceContext>;
  manager?: ExternalBotManagerPorts;
  services: CrmServices;
};

export function registerExternalBotRoutes(
  crmFeature: Hono,
  options: RegisterExternalBotRoutesOptions,
) {
  crmFeature.get("/bot/configuration", async (context) =>
    handleExternalBot(context, async () => {
      const serviceContext = await options.createContext(context);
      assertExternalBotRead(serviceContext);
      const integration =
        await options.services.getExternalBotConfiguration(serviceContext);
      return context.json(toExternalBotConfigurationRead(integration));
    }),
  );

  crmFeature.patch("/bot/configuration", async (context) =>
    handleExternalBot(context, async () => {
      const input = await parseBody(
        context,
        crmExternalBotConfigurationPatchSchema,
      );
      const serviceContext = await options.createContext(context);
      assertExternalBotManage(serviceContext);
      const update: UpdateExternalBotIntegrationInput = {};
      if (input.enabled !== undefined) update.enabled = input.enabled;
      if (input.webhookSecret !== undefined) {
        update.webhookSecret = input.webhookSecret;
      }
      if (input.webhookUrl !== undefined) update.webhookUrl = input.webhookUrl;
      const integration = await options.services.updateExternalBotConfiguration(
        serviceContext,
        update,
      );
      return context.json(toExternalBotConfigurationRead(integration));
    }),
  );

  crmFeature.post("/bot/test", async (context) =>
    handleExternalBot(context, async () => {
      const input = await parseBody(context, crmExternalBotTestInputSchema);
      const serviceContext = await options.createContext(context);
      assertExternalBotManage(serviceContext);
      const routing = await options.services.getRoutingPolicy(serviceContext);
      const route = routing.channels.find(
        (item) => item.channel === input.channel,
      )?.storeDefault;
      const blocked = route?.blocked ?? {
        code: "policy_not_configured",
        message: "No route is configured for this channel.",
        remediation: "Configure a ready channel connection first.",
      };
      return context.json(
        crmExternalBotTestResultSchema.parse({
          action: input.action,
          channel: input.channel,
          diagnostics: {
            code: route?.ready ? "DRY_RUN_READY" : blocked.code,
            message: route?.ready
              ? "Synthetic validation completed; no provider operation occurred."
              : blocked.message,
            retryable: false,
          },
          officialOperationOccurred: false,
          requestId: serviceContext.requestId,
          status: route?.ready ? "dry_run_ready" : "blocked",
        }),
      );
    }),
  );

  crmFeature.post("/bot/actions", async (context) =>
    handleExternalBot(context, async () => {
      const manager = requireManager(options.manager);
      const credential = bearerCredential(context.req.header("authorization"));
      const identity =
        await manager.actionAuthenticator.authenticate(credential);
      if (!identity) {
        throw botError(
          "CRM_BOT_UNAUTHORIZED",
          "Bot credential is invalid.",
          401,
        );
      }
      const input = await parseBody(context, externalBotActionSchema);
      const base = await options.createWebhookContext(context);
      const record = await executeExternalBotAction(
        createBotActionContext(base, identity),
        input,
        manager,
      );
      const providerOperationId = readProviderOperationId(record);
      return context.json(
        crmExternalBotActionAcceptedResultSchema.parse({
          actionId: record.id,
          ...(providerOperationId ? { providerOperationId } : {}),
          requestId: base.requestId,
          status: record.status,
        }),
        record.status === "completed" ? 200 : 202,
      );
    }),
  );

  crmFeature.post("/bot/proposals/:proposalId/decision", async (context) =>
    handleExternalBot(context, async () => {
      const manager = requireManager(options.manager);
      const input = await parseBody(
        context,
        crmExternalBotProposalDecisionInputSchema,
      );
      const serviceContext = await options.createContext(context);
      assertExternalBotProposalDecide(serviceContext);
      const result = await decideExternalBotProposal(
        serviceContext,
        {
          decision: input.decision,
          expectedRevision: input.expectedRevision,
          proposalId: context.req.param("proposalId"),
          ...(input.reason === undefined ? {} : { reason: input.reason }),
        },
        manager,
      );
      return context.json(
        crmExternalBotProposalDecisionResultSchema.parse({
          actionId: result.action.id,
          actionStatus: result.action.status,
          decision: result.proposal.decision,
          proposalId: result.proposal.id,
          proposalRevision: result.proposal.revision,
          requestId: serviceContext.requestId,
        }),
      );
    }),
  );
}
