// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AutomationApi } from "./apiClient";
import type { AutomationRun } from "./types";
import { AutomationWorkspace } from "./AutomationWorkspace";

const proposalDigest = "a".repeat(64);

afterEach(cleanup);

describe("AutomationWorkspace", () => {
  it("shows an honest preview and submits a digest-bound approval", async () => {
    const pendingRun = automationRun();
    const approvedRun: AutomationRun = {
      ...pendingRun,
      pendingApprovalCount: 0,
      status: "approved",
      version: 5,
      steps: pendingRun.steps.map((step) => ({
        ...step,
        approval: { ...step.approval!, status: "approved", version: 3 },
        status: "approved",
        version: 4,
      })),
    };
    const api = automationApi(pendingRun, approvedRun);
    const user = userEvent.setup();

    render(
      <AutomationWorkspace
        api={api}
        grantedPermissions={["automation.approve"]}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Central de automações" }),
    ).toBeVisible();
    expect(
      await screen.findByText(
        "Esta é uma prévia determinística. Nenhum navegador, API externa ou mutação foi executado.",
      ),
    ).toBeVisible();
    expect(screen.getByText("Modo seguro: execução desativada")).toBeVisible();
    expect(screen.getByText("Etapa 1")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Nova automação" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Cancelar prévia" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Validar/ }));
    await user.click(screen.getByRole("button", { name: "Aprovar plano" }));

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText(
        "Mesmo após a aprovação, a execução de ferramentas permanece desativada.",
      ),
    ).toBeVisible();
    await user.click(
      within(dialog).getByRole("button", { name: "Aprovar plano" }),
    );

    await waitFor(() =>
      expect(api.approveStep).toHaveBeenCalledWith({
        expectedApprovalVersion: 2,
        expectedProposalDigest: proposalDigest,
        expectedRunVersion: 4,
        expectedStepVersion: 3,
        runId: "run_1",
        stepId: "step_1",
      }),
    );
  });
});

function automationApi(
  pendingRun: AutomationRun,
  approvedRun: AutomationRun,
): AutomationApi {
  return {
    approveStep: vi.fn().mockResolvedValue(approvedRun),
    cancelRun: vi
      .fn()
      .mockResolvedValue({ ...pendingRun, status: "cancelled" }),
    createRun: vi.fn().mockResolvedValue(pendingRun),
    getRun: vi.fn().mockResolvedValue(pendingRun),
    listRuns: vi.fn().mockResolvedValue({
      data: [
        {
          ...pendingRun,
          pendingApprovalCount: 1,
          stepCount: 1,
        },
      ],
      meta: { limit: 40, offset: 0, total: 1 },
    }),
    rejectStep: vi
      .fn()
      .mockResolvedValue({ ...pendingRun, status: "rejected" }),
  };
}

function automationRun(): AutomationRun {
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
          proposalDigest,
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
  };
}
