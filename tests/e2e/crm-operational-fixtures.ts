import type { Page } from "@playwright/test";
import { createCampaignBootstrap } from "./crm-whatsapp-campaigns-fixtures";
import {
  createBirthDateLead,
  installBirthDateApiMocks,
} from "./crm-new-feature-fixtures";
import {
  installCampaignApiMocks,
  installNoopCampaignEventSource,
} from "./crm-whatsapp-campaigns-helpers";
import { installLocalOwnerSession } from "./crm-whatsapp-test-helpers";

export async function installOperationalCrm(
  page: Page,
  deniedPermissions: string[] = [],
) {
  await installLocalOwnerSession(page);
  await installNoopCampaignEventSource(page);
  await installCampaignApiMocks(page);
  await installBirthDateApiMocks(page);
  const bootstrap = createCampaignBootstrap();
  bootstrap.defaultStore.effectivePermissions.push(
    "lead.create",
    "lead.update",
    "crm.pipeline.read",
  );
  bootstrap.defaultStore.effectivePermissions =
    bootstrap.defaultStore.effectivePermissions.filter(
      (permission) => !deniedPermissions.includes(permission),
    );
  await page.route("**/api/v1/session/bootstrap", (route) =>
    route.fulfill({ json: bootstrap }),
  );
  const lead = {
    ...createBirthDateLead(),
    responseState: "responded",
    humanAttendanceState: "waiting_human",
    lastInteractionAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    nextTask: {
      id: "task-return",
      title: "Retornar proposta do Civic",
      dueAt: "2020-01-01T13:00:00Z",
    },
  };
  const boardQueries: URLSearchParams[] = [];
  await page.route("**/api/v1/crm/leads/board**", (route) => {
    boardQueries.push(new URL(route.request().url()).searchParams);
    return route.fulfill({
      json: {
        stages: [
          { leads: [lead], pipelineStageId: "new", total: 1, nextCursor: null },
        ],
      },
    });
  });
  let scheduled = {
    id: "scheduled-followup",
    content: "Olá Ana, posso confirmar sua visita amanhã?",
    scheduledAt: "2030-01-10T13:00:00Z",
    status: "pending",
    connectionId: "24000000-0000-4000-8000-000000000101",
    cycleId: "cycle-followup",
    createdAt: "2026-01-01T13:00:00Z",
    updatedAt: "2026-01-01T13:00:00Z",
    createdByUserId: null,
    cancelledAt: null as string | null,
    sentAt: null,
    sentMessageId: null,
    errorMessage: null,
    metadata: {},
    recipientAddress: lead.buyerPhone,
  };
  const scheduleQueries: URLSearchParams[] = [];
  await page.route("**/api/v1/crm/scheduled-messages**", async (route) => {
    const request = route.request();
    if (request.method() === "GET") {
      scheduleQueries.push(new URL(request.url()).searchParams);
      return route.fulfill({ json: [scheduled] });
    }
    if (
      request.method() === "DELETE" &&
      request.url().endsWith("/scheduled-followup")
    ) {
      scheduled = {
        ...scheduled,
        status: "cancelled",
        cancelledAt: new Date().toISOString(),
      };
      return route.fulfill({ json: scheduled });
    }
    return route.fallback();
  });
  const imports: Record<string, unknown>[] = [];
  await page.route("**/api/v1/crm/leads/import", async (route) => {
    imports.push(route.request().postDataJSON());
    return route.fulfill({ json: { created: 1, skipped: 1, errors: [] } });
  });
  return { lead, boardQueries, scheduleQueries, imports };
}
