import type { Page, Route } from "@playwright/test";
import type {
  AutomationRun,
  CreateAutomationRunInput,
} from "../../apps/web/src/features/automation/types";

export const automationPermissions = [
  "automation.read",
  "automation.run",
  "automation.cancel",
  "automation.approve",
];
export const automationProposalDigest = "a".repeat(64);

type MutationKind = "approve" | "cancel" | "create" | "reject";
type ApiFailure = {
  code: string;
  message: string;
  requestId: string;
  status: number;
};

export async function installAutomationRoutes(
  page: Page,
  options: {
    failures?: Partial<Record<MutationKind, ApiFailure>>;
    initialRun?: AutomationRun | null;
  } = {},
) {
  let currentRun =
    options.initialRun === undefined ? pendingRun() : options.initialRun;
  const requests: Record<MutationKind, unknown[]> = {
    approve: [],
    cancel: [],
    create: [],
    reject: [],
  };
  await page.route("**/api/v1/automation/runs**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const mutation = mutationKind(request.method(), pathname);
    if (mutation) {
      const body = request.postDataJSON() as unknown;
      requests[mutation].push(body);
      const failure = options.failures?.[mutation];
      if (failure) {
        await fulfillJson(route, failure, failure.status);
        return;
      }
      if (mutation === "create") {
        const input = body as CreateAutomationRunInput;
        currentRun = pendingRun({
          context: input.context ?? {},
          id: "run_created",
          objective: input.objective,
          version: 1,
        });
      } else if (currentRun) {
        currentRun = transitionRun(currentRun, mutation);
      }
      await fulfillJson(route, { data: currentRun });
      return;
    }
    if (pathname !== "/api/v1/automation/runs") {
      await fulfillJson(route, { data: currentRun });
      return;
    }
    await fulfillJson(route, {
      data: currentRun ? [summary(currentRun)] : [],
      meta: { limit: 40, offset: 0, total: currentRun ? 1 : 0 },
    });
  });
  return { requests };
}

export function apiFailure(code: string, requestId: string): ApiFailure {
  return {
    code,
    message: "The reviewed automation state changed.",
    requestId,
    status: 409,
  };
}

function mutationKind(method: string, pathname: string): MutationKind | null {
  if (method !== "POST") return null;
  if (pathname === "/api/v1/automation/runs") return "create";
  if (pathname.endsWith("/approve")) return "approve";
  if (pathname.endsWith("/reject")) return "reject";
  if (pathname.endsWith("/cancel")) return "cancel";
  return null;
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    status,
  });
}

function pendingRun(overrides: Partial<AutomationRun> = {}): AutomationRun {
  return {
    context: {},
    createdAt: "2026-07-11T12:00:00.000Z",
    createdByActorId: "user_1",
    executionEnabled: false,
    id: "run_1",
    objective: "Revisar veículos sem fotos",
    pendingApprovalCount: 1,
    status: "awaiting_approval",
    steps: [
      {
        approval: {
          createdAt: "2026-07-11T12:00:00.000Z",
          decidedAt: null,
          decidedByActorId: null,
          id: "approval_1",
          proposalDigest: automationProposalDigest,
          status: "pending",
          updatedAt: "2026-07-11T12:00:00.000Z",
          version: 2,
        },
        createdAt: "2026-07-11T12:00:00.000Z",
        executionEnabled: false,
        id: "step_1",
        kind: "read_only_preview",
        position: 1,
        risk: "low",
        status: "awaiting_approval",
        summary: "Listar veículos que ainda não possuem fotos publicadas.",
        title: "Inspecionar inventário",
        updatedAt: "2026-07-11T12:00:00.000Z",
        version: 3,
      },
    ],
    stepCount: 1,
    updatedAt: "2026-07-11T12:00:00.000Z",
    version: 4,
    ...overrides,
  };
}

function transitionRun(
  run: AutomationRun,
  mutation: Exclude<MutationKind, "create">,
): AutomationRun {
  const status =
    mutation === "approve"
      ? "approved"
      : mutation === "reject"
        ? "rejected"
        : "cancelled";
  return {
    ...run,
    pendingApprovalCount: 0,
    status,
    steps: run.steps.map((step) => ({
      ...step,
      approval: step.approval
        ? { ...step.approval, status, version: step.approval.version + 1 }
        : null,
      status,
      version: step.version + 1,
    })),
    version: run.version + 1,
  };
}

function summary(run: AutomationRun) {
  return {
    createdAt: run.createdAt,
    createdByActorId: run.createdByActorId,
    executionEnabled: false as const,
    id: run.id,
    objective: run.objective,
    pendingApprovalCount: run.status === "awaiting_approval" ? 1 : 0,
    status: run.status,
    stepCount: run.steps.length,
    updatedAt: run.updatedAt,
    version: run.version,
  };
}
