import {
  assertEntitlement,
  assertPermission,
} from "../../../../shared/authorization.js";
import type {
  ServiceContext,
  StoreScopedServiceContext,
} from "../../../../shared/serviceContext.js";
import type { CrmBotPublicFinancingSimulationInput } from "../../ports/crmFinancingBotActions.js";
import {
  safeCredereBotResult,
  safeCredereReadinessResult,
} from "../../whatsapp/whatsappBotCredereActionSupport.js";
import {
  readOptionalRecord,
  readRequiredText,
} from "../../whatsapp/whatsappBotActionSupport.js";
import {
  requireCrmScope,
  type CrmServicePorts,
} from "../CrmService/serviceSupport.js";
import {
  auditWhatsappServiceEvent,
  logWhatsappServiceEvent,
} from "./serviceSupport.js";
import {
  WhatsappBotActionError,
  type WhatsappBotActionName,
} from "./whatsappBotIntegration.js";
import type { ExecuteWhatsappBotActionInput } from "./whatsappBotActions.js";

export async function executeCredereReadinessAction(
  context: ServiceContext,
  ports: CrmServicePorts,
) {
  return runCredereBotAction(
    context,
    "credere_readiness",
    "financing.simulation.read",
    "data_access",
    "Read Credere bot readiness",
    async () =>
      safeCredereReadinessResult(
        await getFinancingBotActions(ports).readiness(context),
      ),
  );
}

export async function executeCredereCreateSimulationAction(
  context: ServiceContext,
  input: ExecuteWhatsappBotActionInput,
  ports: CrmServicePorts,
) {
  return runCredereBotAction(
    context,
    "credere_create_simulation",
    "financing.simulation.create",
    "data_change",
    "Created Credere bot simulation",
    async () => {
      const idempotencyKey = requireIdempotencyKey(input);
      const simulation = readOptionalRecord(input.payload, "simulation");
      if (!Object.keys(simulation).length) {
        throw new WhatsappBotActionError(
          "Payload field simulation is required.",
          "CRM_WHATSAPP_BOT_ACTION_VALIDATION_ERROR",
        );
      }
      const consent = readOptionalRecord(simulation, "consent");
      if (consent.creditSimulation !== true || consent.personalData !== true) {
        throw new WhatsappBotActionError(
          "Explicit consent is required for Credere simulation creation.",
          "CRM_WHATSAPP_BOT_ACTION_VALIDATION_ERROR",
        );
      }
      return safeCredereBotResult(
        await getFinancingBotActions(ports).createSimulation(context, {
          idempotencyKey,
          payload: simulation as CrmBotPublicFinancingSimulationInput,
        }),
      );
    },
  );
}

export async function executeCredereGetSimulationAction(
  context: ServiceContext,
  input: ExecuteWhatsappBotActionInput,
  ports: CrmServicePorts,
) {
  return runCredereBotAction(
    context,
    "credere_get_simulation",
    "financing.simulation.read",
    "data_access",
    "Read Credere bot simulation",
    async () =>
      safeCredereBotResult(
        await getFinancingBotActions(ports).getSimulation(context, {
          refresh: input.payload?.refresh === true,
          uuid: readRequiredText(input.payload, "uuid"),
        }),
      ),
  );
}

export function assertCredereBotActionAuthorized(
  context: ServiceContext,
  action: WhatsappBotActionName,
) {
  requireFinancingBotAction(
    context,
    action === "credere_create_simulation"
      ? "financing.simulation.create"
      : "financing.simulation.read",
  );
}

export function isCredereBotAction(action: WhatsappBotActionName) {
  return (
    action === "credere_create_simulation" ||
    action === "credere_get_simulation" ||
    action === "credere_readiness"
  );
}

export function botActionPermission(action: WhatsappBotActionName) {
  return action === "credere_create_simulation"
    ? "financing.simulation.create"
    : action === "credere_get_simulation" || action === "credere_readiness"
      ? "financing.simulation.read"
      : "crm.whatsapp.integrations.manage";
}

function requireFinancingBotAction(
  context: ServiceContext,
  permission: "financing.simulation.create" | "financing.simulation.read",
) {
  assertPermission(context, permission);
  const scope = requireCrmScope(context);
  assertEntitlement(
    {
      ...context,
      storeId: scope.storeId,
      tenantId: scope.tenantId,
    } as StoreScopedServiceContext,
    "simulations",
  );
  return scope;
}

async function runCredereBotAction<T>(
  context: ServiceContext,
  action:
    | "credere_create_simulation"
    | "credere_get_simulation"
    | "credere_readiness",
  permission: "financing.simulation.create" | "financing.simulation.read",
  category: "data_access" | "data_change",
  summary: string,
  run: () => Promise<T>,
): Promise<T> {
  const scope = requireFinancingBotAction(context, permission);
  logWhatsappServiceEvent(context, `crm.whatsapp.bot.${action}.started`, {
    action,
    permission,
  });
  try {
    const result = await run();
    await auditWhatsappServiceEvent(context, {
      action: `crm.whatsapp.bot.${action}`,
      category,
      entityId: scope.storeId,
      entityType: "crm_whatsapp_bot_action",
      metadata: { action },
      permission,
      storeId: scope.storeId,
      summary,
      tenantId: scope.tenantId,
    });
    return result;
  } catch (error) {
    await auditWhatsappServiceEvent(
      context,
      {
        action: `crm.whatsapp.bot.${action}`,
        category,
        entityId: scope.storeId,
        entityType: "crm_whatsapp_bot_action",
        metadata: {
          action,
          errorName: error instanceof Error ? error.name : "UnknownError",
        },
        permission,
        storeId: scope.storeId,
        summary,
        tenantId: scope.tenantId,
      },
      "failed",
    );
    throw error;
  }
}

function getFinancingBotActions(ports: CrmServicePorts) {
  if (ports.financingBotActions) return ports.financingBotActions;
  throw new WhatsappBotActionError(
    "Financing simulation service is not configured.",
    "CRM_WHATSAPP_BOT_ACTION_UNSUPPORTED",
    422,
  );
}

function requireIdempotencyKey(input: ExecuteWhatsappBotActionInput) {
  if (input.idempotencyKey) return input.idempotencyKey;
  throw new WhatsappBotActionError(
    "idempotencyKey is required for Credere simulation creation.",
    "CRM_WHATSAPP_BOT_ACTION_VALIDATION_ERROR",
  );
}
